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
 const {method = "GET", origin = canonical.origin, cookie, json, form, multipart, status = 200, follow = false} = options;
 const headers = new Headers({"X-Forwarded-Host":canonical.host,"X-Forwarded-Proto":"https"});
 if(method !== "GET") headers.set("Origin",origin);
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

 location(await request("/standalone/acceso",{status:307}),/^\/admin\/acceso$/);
 location(await request("/api/admin/session",{method:"POST",origin:"https://untrusted.example",form:{email:adminEmail,password},status:303}),/error=origen$/);
 const admin = await login(adminEmail);
 assert.match(await (await request("/admin/personalizar/identidad",{cookie:admin})).text(),/Identidad visual/);
 location(await request("/api/admin/site-section",{method:"POST",cookie:admin,form:{
  section:"identidad",tagline:"Nexus de prueba",primaryColor:"#CB2027",whatsapp:"+50588887777",contactEmail:"contact@example.invalid"
 },status:303}),/identidad\?saved=1$/);
 assert.equal((await db.siteConfig.findUniqueOrThrow({where:{id:"main"}})).whatsapp,"50588887777");
 location(await request("/api/admin/users",{method:"POST",cookie:admin,form:{intent:"create",name:"Agente Prueba",email:agentEmail,password,confirmPassword:password,roles:"agente"},status:303}),/status=creado$/);
 const agent = await db.adminUser.findUniqueOrThrow({where:{email:agentEmail}});
 const initialAgentSession = await login(agentEmail);
 location(await request("/api/admin/users",{method:"POST",cookie:admin,form:{intent:"profile",id:agent.id,name:"Agente Editado",email:agentEmail},status:303}),/status=perfil$/);
 assert.equal((await db.adminUser.findUniqueOrThrow({where:{id:agent.id}})).name,"Agente Editado");
 location(await request("/api/admin/session",{cookie:initialAgentSession,status:303}),/error=sesion$/);
 const agentSession = await login(agentEmail);
 await request("/api/admin/users",{method:"POST",cookie:agentSession,form:{intent:"toggle",id:agent.id},status:403});
 await request("/api/standalone/manage",{method:"POST",cookie:agentSession,json:{action:"property.delete",id:"any"},status:403});
 assert.match(await (await request("/admin/leads",{cookie:admin})).text(),/Prospectos/);
 console.log("PASS admin and agent login, profile edit, revocation and role separation");

 const lead = await (await request("/api/admin/leads",{method:"POST",cookie:admin,json:{name:"Prospecto de prueba",phone:"88887777",consent:true},status:201})).json();
 await request("/api/admin/leads/"+lead.id,{method:"PATCH",cookie:agentSession,json:{status:"contactado"},status:404});
 await request("/api/admin/leads/"+lead.id,{method:"PATCH",cookie:admin,json:{assignedAgentId:agent.id,status:"seguimiento",note:"Nota de prueba"}});
 const persistedLead = await db.lead.findUniqueOrThrow({where:{id:lead.id},include:{crm:true,assignmentHistory:true,notes:true}});
 assert.equal(persistedLead.assignedAgentId,agent.id);
 assert.equal(persistedLead.crm.status,"seguimiento");
 assert.equal(persistedLead.assignmentHistory.length,1);
 assert.equal(persistedLead.notes.length,1);
 assert.equal((await (await request("/api/admin/leads",{cookie:agentSession})).json()).leads[0].id,lead.id);

 const fields = {title:"Casa de aceptación",city:"Managua",neighborhood:"Centro",description:"Propiedad de aceptación funcional",type:"Casa",operation:"venta",price:"250000",bedrooms:"3",bathrooms:"2",areaM2:"160"};
 const created = await Promise.all([fields,{...fields,title:"Casa de prueba concurrente"}].map(form=>request("/api/admin/properties",{method:"POST",cookie:admin,form,status:303})));
 const ids = created.map(response=>location(response,/\/editar\?created=1$/).split("/")[3]);
 const [property,second] = await Promise.all(ids.map(id=>db.property.findUniqueOrThrow({where:{id}})));
 assert.match(property.refCode,/^NRE-\d{6}$/);
 assert.notEqual(property.refCode,second.refCode);
 const edit = "/api/admin/properties/"+property.id;
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
 await request(photo.url,{status:404});
 await request(photo.url,{cookie:agentSession,status:404});
 assert.equal((await request(photo.url,{cookie:admin})).headers.get("content-type"),"image/webp");
 location(await request(edit,{method:"POST",cookie:admin,form:{intent:"publish"},status:303}),/updated=1$/);
 assert.match(await (await request("/",{follow:true})).text(),/Encuentra el lugar/);
 assert.match(await (await request("/propiedades",{follow:true})).text(),new RegExp(title));
 const page = await (await request(detail,{follow:true})).text();
 assert.match(page,/Casa editada de aceptación/);
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

 // Remove a table in this disposable schema to prove health detects incompatible deployments.
 await db.$executeRaw`DROP TABLE "PropertySequence"`;
 assert.equal((await (await request("/api/health",{status:503})).json()).reason,"schema_incomplete");
 console.log("PASS unpublication, confirmation, related data retention, logout and negative health");
}finally{
 await db.$disconnect();
}
