import assert from "node:assert/strict";
import {execFileSync} from "node:child_process";
const origin=process.env.TEST_ORIGIN||"http://localhost:3000";
assert.equal(new URL(origin).hostname,"localhost","Never test template switches in production.");
const email=process.env.ADMIN_EMAIL,password=process.env.ADMIN_PASSWORD;
assert.ok(email&&password,"Credentials for CI required");
const form=new FormData();form.set("email",email);form.set("password",password);
const login=await fetch(origin+"/api/admin/session",{method:"POST",headers:{Origin:origin},body:form,redirect:"manual"});
assert.equal(login.status,303,"Admin test login failed");
const cookie=login.headers.getSetCookie().find(s=>s.startsWith("webappecloud_session="))?.split(";")[0];
assert.ok(cookie,"No admin session");
const get=async(path,authenticated=false)=>fetch(origin+path,{headers:authenticated?{Cookie:cookie}:{},redirect:"manual"});
const post=async(values)=>fetch(origin+"/api/admin/site-template",{
 method:"POST",headers:{Origin:origin,Cookie:cookie},body:new URLSearchParams(values),redirect:"manual"
});
const select=async templateKey=>{
 const r=await post({intent:"select",templateKey});
 assert.equal(r.status,303,"Template select redirect");
 assert.match(r.headers.get("location")||"",/saved=1/);
};
const original=await get("/");
assert.equal(original.status,200);
assert.ok((await original.text()).includes("nexus-hero"),"Legacy site must remain real-estate by default");
const adminStart=await get("/admin/personalizar/plantilla",true);
assert.equal(adminStart.status,200);
const markup=await adminStart.text();
for(const key of ["real-estate","education","services"])assert.ok(markup.includes('value="'+key+'"'),"Missing template "+key);
assert.match(markup,/Biblioteca de plantillas/);
assert.ok(markup.includes("Vista previa:"),"Preview heading must exist");
assert.ok(markup.includes("Inmobiliaria"),"Preview must identify the current template");
assert.match(markup,/Escritorio/);
assert.match(markup,/Celular/);
assert.match(markup,/template-preview-stage-desktop/);
assert.match(markup,/template-preview-safe/);
assert.ok(!markup.includes("Confirmar y aplicar plantilla"),"Current template must not prompt an unnecessary publication");
const unchangedAfterPreview=await get("/");
assert.equal(unchangedAfterPreview.status,200);
assert.match(await unchangedAfterPreview.text(),/nexus-hero/,"Opening the gallery must not switch the published template");
await select("education");
const school=await get("/");assert.equal(school.status,200);
let html=await school.text();
assert.match(html,/Aprender abre nuevas oportunidades/);
assert.match(html,/Programas de formación/);
assert.ok(!html.includes('href="/propiedades"'),"Education must not link to catalog");
const about=await get("/nosotros");assert.equal(about.status,200);
assert.match(await about.text(),/Comprometidos con tu aprendizaje/);
const offerings=await get("/servicios");assert.equal(offerings.status,200);
assert.match(await offerings.text(),/PROGRAMAS EDUCATIVOS/);
const contact=await get("/contacto");assert.equal(contact.status,200);
assert.match(await contact.text(),/Enviar consulta/);
const extras=new FormData();
extras.set("sections",JSON.stringify([{id:"section-programs-example",type:"heading",text:"Conoce nuestros programas flexibles"}]));
const extraSaved=await fetch(origin+"/api/admin/site-extras/servicios",{method:"POST",
 headers:{Origin:origin,Cookie:cookie},body:extras,redirect:"manual"});
assert.equal(extraSaved.status,303,"Institutional extra sections should be editable");
assert.match(extraSaved.headers.get("location")||"",/blocksSaved=1/);
assert.match(await (await get("/servicios")).text(),/Conoce nuestros programas flexibles/);
extras.set("sections","[]");
const extraCleared=await fetch(origin+"/api/admin/site-extras/servicios",{method:"POST",
 headers:{Origin:origin,Cookie:cookie},body:extras,redirect:"manual"});
assert.equal(extraCleared.status,303);
assert.ok(!(await (await get("/servicios")).text()).includes("Conoce nuestros programas flexibles"));

const submission=await fetch(origin+"/api/leads",{
 method:"POST",headers:{Origin:origin,"Content-Type":"application/json"},
 body:JSON.stringify({name:"Solicitante educación",phone:"88887777",email:"educacion@example.com",message:"Quiero conocer los programas",consent:"yes"})
});
assert.equal(submission.status,201,"Generic contact form must register inquiry");
assert.equal((await submission.json()).ok,true);
const inquiries=await get("/admin/leads",true);assert.equal(inquiries.status,200);
assert.match(await inquiries.text(),/Solicitante educación/,"Inquiries must appear in tenant CRM");

assert.equal((await get("/propiedades")).status,404);
assert.equal((await get("/api/propiedades/casa-zona-ejecutiva/pdf")).status,404,"Public property PDFs must be hidden when template changes");
assert.equal((await get("/api/propiedades/casa-zona-ejecutiva/pdf-personalizado")).status,404,"Custom property PDFs must be hidden when template changes");
const dash=await get("/admin",true);assert.equal(dash.status,200);
const adminHtml=await dash.text();
assert.match(adminHtml,/Consultas recientes/);
assert.ok(!adminHtml.includes('href="/admin/propiedades"'),"Generic dashboard must not show property tools");
const edit=await get("/admin/personalizar/paginas/home",true);
assert.equal(edit.status,200,"Institutional template must expose independent visual sections");
const editHtml=await edit.text();
assert.match(editHtml,/Secciones adicionales/);
assert.match(editHtml,/Editar textos de plantilla/);
const menu=await get("/admin/personalizar/menu",true);assert.equal(menu.status,200);
const menuHtml=await menu.text();
assert.ok(menuHtml.includes("Programas"));
assert.ok(!menuHtml.includes("Propiedades</button>"),"Incompatible menu must be hidden");
const newText="Educación personalizada para tus objetivos";
const settings={intent:"content",templateKey:"education",eyebrow:"APRENDER JUNTOS",headline:newText,
 description:"Explora programas de aprendizaje diseñados para nuevas oportunidades.",actionLabel:"Conocer programas",
 aboutTitle:"Aprendemos con propósito",aboutText:"Formación con acompañamiento y proyectos prácticos.",
 contactTitle:"Solicitar información académica",contactText:"Nuestro equipo te ayudará a elegir un programa."};
for(let i=0;i<3;i++){settings["cardTitle"+i]="Programa "+(i+1);settings["cardDescription"+i]="Descripción clara y completa del programa "+(i+1);}
const saved=await post(settings);assert.equal(saved.status,303);assert.match(saved.headers.get("location")||"",/saved=1/);
assert.match(await (await get("/")).text(),/Educación personalizada para tus objetivos/);
await select("services");
assert.match(await (await get("/")).text(),/Servicios profesionales para tus proyectos/);
assert.ok(!(await (await get("/")).text()).includes(newText),"Unrelated template cannot inherit education content");
await select("education");
assert.match(await (await get("/")).text(),/Educación personalizada para tus objetivos/);
const invalid=await post({intent:"select",templateKey:"unknown"});
assert.equal(invalid.status,303);assert.match(invalid.headers.get("location")||"",/error=datos/);
assert.match(await (await get("/")).text(),/Educación personalizada para tus objetivos/);
await select("real-estate");
assert.ok((await (await get("/")).text()).includes("nexus-hero"),"Restore existing first client");
assert.equal((await get("/propiedades")).status,200,"Real-estate catalog must return");
const hostCode=execFileSync("curl",["-sS","-o","/dev/null","-w","%{http_code}","-H","Host: other-tenant.invalid",origin+"/"],{encoding:"utf8"}).trim();
assert.equal(hostCode,"404","Other tenant host must remain isolated");
console.log("Template switching: education, services, real-estate legacy, per-template content, public navigation and host isolation passed.");
