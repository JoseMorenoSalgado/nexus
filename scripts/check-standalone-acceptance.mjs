/** Run only against a disposable, empty PostgreSQL database and a local Nexus process. */
import assert from "node:assert/strict";
import {createHash} from "node:crypto";
import sharp from "sharp";
import {PDFDocument} from "pdf-lib";
import {PrismaClient} from "../src/generated/standalone-postgres/index.js";

const app = new URL(process.env.NEXUS_TEST_URL || "http://127.0.0.1:3100");
const canonical = new URL(process.env.SITE_URL || "https://nexus-ci.example");
const database = new URL(process.env.NEXUS_TEST_DATABASE_URL || "postgresql://localhost/nexus_acceptance");
assert.equal(app.hostname, "127.0.0.1");
assert.equal(database.hostname, "127.0.0.1");
assert.equal(database.pathname, "/nexus_acceptance");
assert.equal(canonical.protocol, "https:");
const db = new PrismaClient({datasources:{db:{url:database.toString()}}});
const adminEmail = "admin-acceptance@example.invalid";
const agentEmail = "agent-acceptance@example.invalid";
const password = "Nexus-Acceptance-12345";

async function request(path, options = {}){
 const {method = "GET", origin = canonical.origin, referer, cookie, json, form, multipart, status = 200, follow = false, rsc = false} = options;
 const headers = new Headers({"X-Forwarded-Host":canonical.host,"X-Forwarded-Proto":"https"});
 if(rsc)headers.set("RSC","1");
 if(method !== "GET"&&origin!==null) headers.set("Origin",origin);
 if(referer) headers.set("Referer",referer);
 if(cookie) headers.set("Cookie",cookie);
 if(json) headers.set("Content-Type","application/json");
 const body = json ? JSON.stringify(json) : form ? new URLSearchParams(form) : multipart;
 const response = await fetch(new URL(path,app),{method,headers,body,redirect:follow?"follow":"manual",signal:AbortSignal.timeout(45000)});
 assert.equal(response.status,status,`${method} ${path} (${response.headers.get("location")||"no redirect"})`);
 return response;
}

function location(response, pattern){
 const value = response.headers.get("location");
 assert.ok(value?.startsWith("/")&&!value.startsWith("//"),"Expected a relative redirect behind Enhance");
 assert.match(value,pattern);
 return value;
}

async function login(email){
 const response = await request("/api/admin/session",{method:"POST",form:{email,password},status:303});
 location(response,/^\/api\/admin\/session$/);
 const cookie = response.headers.get("set-cookie").split(";")[0];
 assert.match(cookie,/^webappecloud_session=[a-f0-9]{64}$/);
 location(await request("/api/admin/session",{cookie,status:303}),/^\/admin$/);
 return cookie;
}

try {
 const tables = await db.$queryRaw`SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE'`;
 assert.equal(tables.length,0,"Acceptance DB must be empty before testing the installer");
 assert.equal((await (await request("/api/health",{status:503})).json()).reason,"not_configured");
 const credentials = {dbType:"postgresql",dbHost:database.hostname,dbPort:database.port||"5432",dbName:"nexus_acceptance",dbUser:decodeURIComponent(database.username),dbPassword:decodeURIComponent(database.password)};
 const setup = {...credentials,institution:"Nexus Acceptance",institutionEmail:"contact@example.invalid",adminName:"Nexus Admin",adminEmail,adminPassword:password};
 await request("/api/install",{method:"POST",json:setup,origin:"https://untrusted.example",status:403});
 const preflight = await fetch(new URL("/api/install/preflight",app),{
  method:"POST",headers:{"Content-Type":"application/json",Origin:canonical.origin,"Sec-Fetch-Site":"same-origin"},
  body:JSON.stringify(credentials),signal:AbortSignal.timeout(15000)
 });
 assert.equal(preflight.status,200);
 assert.equal((await preflight.json()).ready,true,"PostgreSQL preflight");
 assert.equal((await (await request("/api/install",{method:"POST",json:setup})).json()).ok,true);
 await request("/api/install",{method:"POST",json:setup,status:409});
 assert.equal((await (await request("/api/health")).json()).mode,"standalone");
 const legacy = await db.$queryRaw`SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name IN ('Tenant','Domain')`;
 assert.equal(legacy.length,0);
 console.log("PASS installer, canonical origin, repeat protection and PostgreSQL health");

 location(await request("/api/admin/session",{method:"POST",origin:"https://untrusted.example",form:{email:adminEmail,password},status:303}),/error=origen$/);
 const admin = await login(adminEmail);
 const dashboard = await (await request("/admin",{cookie:admin})).text();
 assert.match(dashboard,/admin-mobile-trigger/);
 assert.match(dashboard,/Menú de administración/);
 assert.match(dashboard,/Propiedades recientes/);
 assert.match(dashboard,/Últimos prospectos/);
 assert.match(dashboard,/Estadísticas detalladas/);
 assert.match(dashboard,/Actividad del sitio/);
 assert.match(dashboard,/Tipos de propiedades/);
 location(await request("/admin",{status:307}),/^\/admin\/acceso$/);
 const adminRoutes=[
  ["/admin/cierres","Cierres comerciales"],
  ["/admin/cierres/comisiones","Comisiones y abonos"],
  ["/admin/agenda","Agenda comercial"],
  ["/admin/notificaciones","Notificaciones comerciales"],
  ["/admin/reportes?periodo=7","Reportes comerciales"],
  ["/admin/sistema","Estado técnico independiente"],
  ["/admin/sistema/diagnostico","Estado técnico independiente"],
  ["/admin/operaciones","Gestión inmobiliaria"]
 ];
 for(const [route,title] of adminRoutes){
  const page=await (await request(route,{cookie:admin})).text();
  assert.match(page,/admin-mobile-trigger/);
  assert.match(page,new RegExp(title));
  assert.doesNotMatch(page,/href="\/(?:admin\/)?standalone(?:\/|")/);
 }
 for(const route of ["/standalone","/standalone/admin","/standalone/propiedades","/admin/standalone/cierres"]){
  await request(route,{cookie:admin,status:404});
 }
 assert.deepEqual(await (await request("/api/admin/agenda",{cookie:admin})).json(),{events:[],leads:[]});
 await request("/api/admin/cierres",{method:"POST",cookie:admin,origin:"https://untrusted.example",form:{},status:403});
 await request("/api/admin/comisiones",{method:"POST",cookie:admin,origin:"https://untrusted.example",form:{},status:403});
 await request("/api/admin/dashboard",{cookie:admin});
 location(await request("/admin/cierres",{status:307}),/^\/admin\/acceso$/);
 assert.match(await (await request("/admin/personalizar/identidad",{cookie:admin})).text(),/Identidad visual/);
 location(await request("/api/admin/site-section",{method:"POST",cookie:admin,form:{
  section:"identidad",tagline:"Nexus de prueba",primaryColor:"#CB2027",whatsapp:"+50588887777",contactEmail:"contact@example.invalid"
 },status:303}),/identidad\?saved=1$/);
 assert.equal((await db.siteConfig.findUniqueOrThrow({where:{id:"main"}})).whatsapp,"50588887777");
 location(await request("/api/admin/users",{method:"POST",cookie:admin,form:{intent:"create",name:"Agente Prueba",email:agentEmail,password,confirmPassword:password,roles:"agente"},status:303}),/status=creado$/);
 const agent = await db.adminUser.findUniqueOrThrow({where:{email:agentEmail}});
 assert.match(await (await request("/admin/clientes-agentes/agentes/"+agent.id,{cookie:admin})).text(),/Perfil comercial/);
 const initialAgentSession = await login(agentEmail);
 location(await request("/api/admin/users",{method:"POST",cookie:admin,form:{intent:"profile",id:agent.id,name:"Agente Editado",email:agentEmail},status:303}),/status=perfil$/);
 assert.equal((await db.adminUser.findUniqueOrThrow({where:{id:agent.id}})).name,"Agente Editado");
 location(await request("/api/admin/session",{cookie:initialAgentSession,status:303}),/error=sesion$/);
 const agentSession = await login(agentEmail);
 await request("/api/admin/users",{method:"POST",cookie:agentSession,form:{intent:"toggle",id:agent.id},status:403});
 await request("/api/admin/operaciones",{method:"POST",cookie:agentSession,json:{action:"property.delete",id:"any"},status:403});
 assert.match(await (await request("/admin/leads",{cookie:admin})).text(),/Prospectos/);
 console.log("PASS admin and agent login, profile edit, revocation and role separation");

 const cms="/admin/personalizar";
 assert.match(dashboard,/Mi sitio web/);
 for(const page of ["inicio","paginas?buscar=uno&buscar=dos","menu","medios","paginas/home","paginas/contacto","paginas/propiedades"]){
  await request(cms+"/"+page,{cookie:admin});
 }
 assert.match(await (await request("/")).text(),/src="\/brand\/nexus-icon\.webp"/);
 const pageDraft={slug:"guia-de-compra",title:"Guía de compra",summary:"Resumen de prueba",body:"Contenido de prueba del CMS"};
 const createPage="/api/admin/site-pages";
 const cmsReferer=canonical.origin+cms+"/paginas/nueva";
 location(await request(createPage,{method:"POST",cookie:admin,form:pageDraft,origin:"https://untrusted.example",referer:cmsReferer,status:303}),/error=origen$/);
 location(await request(createPage,{method:"POST",cookie:admin,form:pageDraft,origin:null,referer:cmsReferer,status:303}),/guia-de-compra\?created=1$/);
 await request("/pagina/guia-de-compra",{status:404});
 const uploadedImage=new FormData();
 const img=await sharp({create:{width:120,height:80,channels:3,background:"#234567"}}).png().toBuffer();
 uploadedImage.set("image",new Blob([img],{type:"image/png"}),"guia.png");
 const {id:imageId}=await (await request(createPage+"/guia-de-compra/images",{method:"POST",cookie:admin,multipart:uploadedImage})).json();
 const sections=JSON.stringify([{id:"imagen-guia",type:"image",imageId,alt:"Imagen de la guía",caption:"Vista de prueba"}]);
 location(await request(createPage+"/guia-de-compra",{method:"POST",cookie:admin,form:{...pageDraft,published:"on",sections},status:303}),/guia-de-compra\?saved=1$/);
 assert.match(await (await request("/pagina/guia-de-compra")).text(),/Contenido de prueba del CMS/);
 assert.equal((await request("/api/site-page-images/guia-de-compra/"+imageId)).headers.get("content-type"),"image/webp");
 assert.match(await (await request(cms+"/medios",{cookie:admin})).text(),new RegExp(imageId));
 location(await request(createPage+"/guia-de-compra",{method:"POST",cookie:admin,form:{intent:"status"},status:303}),/paginas\?saved=1$/);
 await request("/pagina/guia-de-compra",{status:404});
 await request("/api/site-page-images/guia-de-compra/"+imageId,{status:404});
 const hero={section:"home",heroEyebrow:"Nexus de prueba",heroHeading:"Portada editada en Nexus",heroHighlight:"Compra con confianza",heroDescription:"Texto guardado desde el editor.",heroButton:"Consultar propiedades"};
 location(await request("/api/admin/site-section",{method:"POST",cookie:admin,form:hero,status:303}),/home\?saved=1$/);
 assert.match(await (await request("/")).text(),/Portada editada en Nexus/);
 assert.match(await (await request(cms+"/paginas/home",{cookie:admin})).text(),/Portada editada en Nexus/);
 location(await request(createPage+"/propiedades",{method:"POST",cookie:admin,form:{intent:"status"},status:303}),/paginas\?saved=1$/);
 await request("/propiedades",{status:404});
 location(await request(createPage+"/propiedades",{method:"POST",cookie:admin,form:{published:"on",intent:"status"},status:303}),/paginas\?saved=1$/);

 const register=await (await request("/admin/leads/nuevo",{cookie:agentSession})).text();
 for(const channel of ["Marketplace","Facebook","Instagram","TikTok","Referido","Cliente"])assert.ok(register.includes(channel),channel);
 assert.match(register,/Consulta general \(sin propiedad\)/);
 const prospect={name:"Consulta de inmueble externo",phone:"88884444",source:"marketplace",externalPropertyInterest:"Casa anunciada por un tercero",consent:true};
 const {id:externalLeadId}=await (await request("/api/admin/leads",{method:"POST",cookie:agentSession,json:prospect,status:201})).json();
 const external=await db.lead.findUniqueOrThrow({where:{id:externalLeadId}});
 assert.equal(external.propertyId,null);
 assert.equal(external.assignedAgentId,agent.id);
 assert.equal(external.source,"marketplace");
 assert.equal(external.externalPropertyInterest,prospect.externalPropertyInterest);
 await request("/api/admin/leads",{method:"POST",cookie:agentSession,json:{...prospect,source:"inventado"},status:400});
 assert.match(await (await request("/admin/clientes-agentes/agentes/"+agent.id,{cookie:agentSession})).text(),/Nueva propiedad/);
 console.log("PASS CMS, branding, page images, publication, lead channels and external interest");

 const lead = await (await request("/api/admin/leads",{method:"POST",cookie:admin,json:{name:"Prospecto de prueba",phone:"88887777",consent:true},status:201})).json();
 const agentDashboard = await (await request("/admin",{cookie:agentSession})).text();
 assert.match(agentDashboard,/Mi espacio comercial/);
 assert.match(agentDashboard,/Propiedades asignadas/);
 assert.doesNotMatch(agentDashboard,/Estadísticas detalladas|Prospecto de prueba/);
 const managerDashboard = await (await request("/admin",{cookie:admin})).text();
 assert.match(managerDashboard,/Centro de actividades/);
 assert.match(managerDashboard,/Prospecto de prueba/);
 await request("/api/admin/leads/"+lead.id,{method:"POST",cookie:agentSession,json:{status:"contactado"},status:404});
 await request("/api/admin/leads/"+lead.id,{method:"POST",cookie:admin,json:{assignedAgentId:agent.id,status:"seguimiento",note:"Nota de prueba"}});
 const persistedLead = await db.lead.findUniqueOrThrow({where:{id:lead.id},include:{crm:true,assignmentHistory:true,notes:true}});
 assert.equal(persistedLead.assignedAgentId,agent.id);
 assert.equal(persistedLead.crm.status,"seguimiento");
 assert.equal(persistedLead.assignmentHistory.length,1);
 assert.equal(persistedLead.notes.length,1);
 assert.equal((await (await request("/api/admin/leads",{cookie:agentSession})).json()).leads[0].id,lead.id);
 await request("/api/admin/leads/"+lead.id,{method:"POST",cookie:agentSession,json:{contact:{name:"Prospecto editado",phone:"88889999",email:"lead@example.invalid",message:"Contacto actualizado"}}});
 const editedLead=await db.lead.findUniqueOrThrow({where:{id:lead.id}});
 assert.equal(editedLead.name,"Prospecto editado");
 assert.equal(editedLead.phone,"88889999");
 assert.equal(editedLead.assignedAgentId,agent.id);
 const appointment=await (await request("/api/admin/agenda",{method:"POST",cookie:agentSession,status:201,json:{
  leadId:lead.id,title:"Llamada de prueba",type:"llamada",startsAt:new Date().toISOString(),durationMinutes:30
 }})).json();
 await request("/api/admin/agenda/"+appointment.id,{method:"POST",cookie:agentSession,json:{status:"realizada"}});
 assert.equal((await db.agendaEvent.findUniqueOrThrow({where:{id:appointment.id}})).status,"realizada");
 assert.match(await (await request("/admin",{cookie:agentSession})).text(),/Prospecto editado/);

 await request("/admin/propiedades?q=casa&q=centro",{cookie:admin});
 await request("/api/admin/operaciones",{method:"POST",cookie:admin,json:{action:"property.create"},status:410});
 const referenceSettings="/api/admin/properties/reference-settings";
 const newPropertyReferer=canonical.origin+"/admin/propiedades/nueva";
 location(await request(referenceSettings,{method:"POST",cookie:admin,form:{prefix:"NIC"},status:303}),/referenceSaved=1$/);
 assert.equal((await db.propertySequence.findUniqueOrThrow({where:{id:"main"}})).prefix,"NIC");
 const fields = {title:"Casa de aceptación",city:"Managua",neighborhood:"Centro",description:"Propiedad de aceptación funcional",type:"Casa",operation:"venta",price:"250000",bedrooms:"3",bathrooms:"2",areaM2:"160"};
 location(await request("/api/admin/properties",{method:"POST",cookie:admin,form:fields,
  origin:"https://untrusted.example",referer:newPropertyReferer,status:303}),/error=origen$/);
 const created = await Promise.all([
  request("/api/admin/properties",{method:"POST",cookie:admin,form:fields,origin:null,referer:newPropertyReferer,status:303}),
  request("/api/admin/properties",{method:"POST",cookie:admin,form:{...fields,title:"Casa de prueba concurrente"},status:303})
 ]);
 const ids = created.map(response=>location(response,/\/editar\?created=1$/).split("/")[3]);
 const [property,second] = await Promise.all(ids.map(id=>db.property.findUniqueOrThrow({where:{id}})));
 assert.match(property.refCode,/^NIC-\d{6}$/);
 assert.notEqual(property.refCode,second.refCode);
 const agentCreated=await request("/api/admin/properties",{method:"POST",cookie:agentSession,form:{...fields,title:"Casa registrada por agente"},status:303});
 const agentPropertyId=location(agentCreated,/\/editar\?created=1$/).split("/")[3];
 assert.equal((await db.property.findUniqueOrThrow({where:{id:agentPropertyId}})).assignedAgentId,agent.id);
 const nextNumber=(await db.propertySequence.findUniqueOrThrow({where:{id:"main"}})).nextNumber;
 location(await request(referenceSettings,{method:"POST",cookie:admin,form:{prefix:"NRE"},status:303}),/referenceSaved=1$/);
 assert.equal((await db.propertySequence.findUniqueOrThrow({where:{id:"main"}})).nextNumber,nextNumber);
 const closingLead=await (await request("/api/admin/leads",{method:"POST",cookie:admin,status:201,json:{
  name:"Prospecto financiero",phone:"88881111",propertyId:second.id,consent:true
 }})).json();
 const byReference=await (await request("/api/admin/leads?q="+encodeURIComponent(second.refCode),{cookie:admin})).json();
 assert.equal(byReference.total,1);
 assert.equal(byReference.leads[0].id,closingLead.id);
 const today=new Date().toISOString().slice(0,10);
 const closing=await (await request("/api/admin/cierres",{method:"POST",cookie:admin,status:201,form:{
  leadId:closingLead.id,kind:"venta",amount:"20000",commissionAmount:"100",closedAt:today,notes:"",agentId:""
 }})).json();
 await request("/api/admin/comisiones",{method:"POST",cookie:admin,status:201,form:{
  closingId:closing.id,amount:"25",paidAt:today,method:"transferencia",reference:"",notes:""
 }});
 const payment=await db.commissionPayment.findFirstOrThrow({where:{closingId:closing.id}});
 const voidForm={intent:"void",reason:"Anulación de la prueba"};
 await request("/api/admin/cierres/"+closing.id,{method:"POST",cookie:admin,form:voidForm,status:409});
 await request("/api/admin/comisiones/"+payment.id,{method:"POST",cookie:admin,form:voidForm});
 await request("/api/admin/cierres/"+closing.id,{method:"POST",cookie:admin,form:voidForm});
 assert.equal((await db.commercialClosing.findUniqueOrThrow({where:{id:closing.id}})).status,"anulado");
 assert.doesNotMatch(await (await request("/admin",{cookie:agentSession})).text(),/Casa de aceptación/);
 assert.match(await (await request("/admin",{cookie:admin})).text(),new RegExp("/admin/propiedades/"+property.id+"/editar"));
 const edit = "/api/admin/properties/"+property.id;
 const editorUrl="/admin/propiedades/"+property.id+"/editar";
 const importedPhoto=await db.photo.create({data:{
  propertyId:property.id,url:"https://example.invalid/foto-importada.jpg",alt:"Fotografía importada",sortOrder:0
 }});
 const editor=await (await request(editorUrl,{cookie:admin})).text();
 assert.match(editor,/Editar propiedad/);
 assert.match(editor,/Fotografía importada/);
 const newLeadPage=await (await request("/admin/leads/nuevo?propertyId="+property.id,{cookie:admin})).text();
 assert.match(newLeadPage,/Registrar nuevo prospecto/);
 assert.match(newLeadPage,new RegExp('value="'+property.id+'" selected'));
 const reportsPage=await (await request("/admin/reportes",{cookie:admin})).text();
 assert.match(reportsPage,/admin-mobile-trigger/);
 assert.match(reportsPage,/Actividad del sitio web/);
 assert.doesNotMatch(editor,/NEXT_HTTP_ERROR_FALLBACK|Identificador de archivo inválido/);
 const editorFlight=await request(editorUrl,{cookie:admin,rsc:true});
 assert.match(editorFlight.headers.get("content-type")||"",/text\/x-component/);
 const editorPayload=await editorFlight.text();
 assert.match(editorPayload,/Editar propiedad/);
 assert.match(editorPayload,/Fotografía importada/);
 assert.doesNotMatch(editorPayload,/NEXT_HTTP_ERROR_FALLBACK|Identificador de archivo inválido/);
 await request(editorUrl,{cookie:agentSession,status:404});
 location(await request("/api/admin/properties/"+second.id,{method:"POST",cookie:admin,
  form:{intent:"delete",confirmation:second.refCode},status:303}),/error=vinculada$/);
 assert.equal(await db.property.count({where:{id:second.id}}),1);
 assert.equal((await db.lead.findUniqueOrThrow({where:{id:closingLead.id}})).propertyId,second.id);
 const detail = "/propiedades/"+property.slug;
 await request(detail,{status:404,follow:true});
 location(await request(edit,{method:"POST",cookie:agentSession,form:{intent:"publish"},status:303}),/error=noexiste$/);
 const title = "Casa editada de aceptación";
 location(await request(edit,{method:"POST",cookie:admin,form:{...fields,title,intent:"save"},status:303}),/saved=1$/);
 assert.equal((await db.property.findUniqueOrThrow({where:{id:property.id}})).title,title);

 const pixels = Buffer.from(Array.from({length:80*80*3},(_,i)=>(i*13)%251));
 const image = await sharp(pixels,{raw:{width:80,height:80,channels:3}}).png().toBuffer();
 const multipart = new FormData();
 multipart.set("photo",new Blob([image],{type:"image/png"}),"acceptance.png");
 const logo = new FormData();
 logo.set("image",new Blob([image],{type:"image/png"}),"logo.png");
 await request("/api/admin/site-media/logo",{method:"POST",cookie:admin,multipart:logo});
 await request("/api/site-media/logo");
 const photo = await (await request(edit+"/photos",{method:"POST",cookie:admin,multipart,status:201})).json();
 await request(edit+"/photos/order",{method:"POST",cookie:admin,origin:"https://untrusted.example",json:{photoIds:[photo.id,importedPhoto.id]},status:403});
 await request(edit+"/photos/order",{method:"POST",cookie:admin,json:{photoIds:[photo.id,importedPhoto.id]}});
 assert.equal((await db.photo.findUniqueOrThrow({where:{id:photo.id}})).sortOrder,0);
 await request(edit+"/photos/"+importedPhoto.id,{method:"POST",cookie:admin});
 assert.equal(await db.photo.count({where:{id:importedPhoto.id}}),0);
 await request(photo.url,{status:404});
 await request(photo.url,{cookie:agentSession,status:404});
 assert.equal((await request(photo.url,{cookie:admin})).headers.get("content-type"),"image/webp");
 location(await request(edit,{method:"POST",cookie:admin,form:{intent:"publish"},status:303}),/updated=1$/);
 assert.match(await (await request("/")).text(),/Portada editada en Nexus/);
 assert.match(await (await request("/propiedades")).text(),new RegExp(title));
 const page = await (await request(detail)).text();
 assert.match(page,/Casa editada de aceptación/);
 assert.match(await (await request("/propiedades?operacion=venta")).text(),new RegExp("href=\""+detail+"\""));
 assert.match(page,/wa\.me\/50588887777/);
 assert.match(page,/Enviar consulta/);
 assert.match(await (await request("/contacto")).text(),/Enviar consulta/);
 await request(photo.url+"?variant=card");
 const document = await PDFDocument.create();
 document.addPage().drawText("Ficha de aceptación");
 const attachment = new FormData();
 attachment.set("document",new Blob([await document.save()],{type:"application/pdf"}),"ficha.pdf");
 await request(edit+"/document",{method:"POST",cookie:admin,multipart:attachment});
 const customPdf = await request("/api/propiedades/"+property.slug+"/pdf-personalizado");
 assert.equal(customPdf.headers.get("content-type"),"application/pdf");
 const pdf = await request("/api/propiedades/"+property.slug+"/pdf");
 assert.equal(pdf.headers.get("content-type"),"application/pdf");
 assert.equal((await PDFDocument.load(await pdf.arrayBuffer())).getPageCount(),1);
 const longDescription="Primera línea de la propiedad.\n"+("Descripción de la propiedad y sus servicios. ".repeat(55));
 await db.property.update({where:{id:property.id},data:{description:longDescription}});
 const extended=await request("/api/propiedades/"+property.slug+"/pdf");
 assert.equal((await PDFDocument.load(await extended.arrayBuffer())).getPageCount(),2);
 const summaryPdf=await request("/api/propiedades/"+property.slug+"/pdf?formato=resumida");
 assert.equal((await PDFDocument.load(await summaryPdf.arrayBuffer())).getPageCount(),1);
 await request(edit+"/document?action=remove",{method:"POST",cookie:admin,origin:"https://untrusted.example",status:403});
 await request(edit+"/document?action=remove",{method:"POST",cookie:admin});
 await request("/api/propiedades/"+property.slug+"/pdf-personalizado",{status:404});
 const inquiry = {name:"Contacto de prueba",phone:"88885555",propertyId:property.id,consent:"yes"};
 await request("/api/leads",{method:"POST",json:inquiry,origin:"https://untrusted.example",status:403});
 await request("/api/leads",{method:"POST",json:inquiry,status:201});
 assert.equal(await db.lead.count({where:{propertyId:property.id,source:"web"}}),1);
 await request("/api/events",{method:"POST",json:{kind:"whatsapp",path:detail},status:201});
 assert.equal(await db.visitEvent.count({where:{kind:"whatsapp",path:detail}}),1);
 console.log("PASS prospect persistence and assignment, concurrent references, upload, publication, public pages, PDF and contact");

 location(await request(edit,{method:"POST",cookie:admin,form:{intent:"unpublish"},status:303}),/updated=1$/);
 await request(detail,{status:404,follow:true});
 await request(photo.url,{status:404});
 location(await request(edit,{method:"POST",cookie:admin,form:{intent:"delete",confirmation:"incorrect"},status:303}),/error=confirmacion$/);
 location(await request(edit,{method:"POST",cookie:admin,form:{intent:"delete",confirmation:property.refCode},status:303}),/deleted=1$/);
 assert.equal(await db.property.count({where:{id:property.id}}),0);
 assert.equal(await db.photo.count({where:{id:photo.id}}),0);
 assert.equal(await db.lead.count({where:{source:"web",name:"Contacto de prueba",propertyId:null}}),1);
 location(await request("/api/admin/logout",{method:"POST",cookie:agentSession,status:303}),/^\/admin\/acceso$/);
 const tokenHash = createHash("sha256").update(agentSession.split("=")[1]).digest("hex");
 assert.equal(await db.adminSession.count({where:{tokenHash}}),0);
 location(await request("/api/admin/session",{cookie:agentSession,status:303}),/error=sesion$/);

 if(process.env.NEXUS_TEST_BROWSER==="1"){
  const {checkPropertiesInBrowser}=await import("./check-properties-browser.mjs");
  await checkPropertiesInBrowser({app,canonical,db,adminEmail,agentEmail,password});
 }

 // Remove a table in this disposable schema to prove health detects incompatible deployments.
 await db.$executeRaw`DROP TABLE "PropertySequence"`;
 assert.equal((await (await request("/api/health",{status:503})).json()).reason,"schema_incomplete");
 console.log("PASS unpublication, confirmation, related data retention, logout and negative health");
}finally{
 await db.$disconnect();
}
