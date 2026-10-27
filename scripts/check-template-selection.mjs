import assert from "node:assert/strict";
import {execFileSync} from "node:child_process";
const origin=process.env.TEST_ORIGIN||"http://localhost:3000";
assert.equal(new URL(origin).hostname,"localhost");
const auth=new URLSearchParams({email:process.env.ADMIN_EMAIL||"",password:process.env.ADMIN_PASSWORD||""});
const login=await fetch(origin+"/api/admin/session",{method:"POST",headers:{Origin:origin},body:auth,redirect:"manual"});
assert.equal(login.status,303,"Administrator login");
const cookie=login.headers.getSetCookie().find(s=>s.startsWith("webappecloud_session="))?.split(";")[0];
assert.ok(cookie);
const get=(path,authenticated=false)=>fetch(origin+path,{headers:authenticated?{Cookie:cookie}:{},redirect:"manual"});
const original=await get("/");
assert.equal(original.status,200);
assert.match(await original.text(),/nexus-hero/);
const settings=await get("/admin/personalizar/plantilla",true);
assert.equal(settings.status,200);
const html=await settings.text();
assert.match(html,/Diseño inmobiliario/);
assert.match(html,/Catálogo de propiedades/);
assert.ok(!html.includes("templatePreview"),"Sector selection must be removed");
for(const sector of ["education","services","ecommerce"]){
 const response=await fetch(origin+"/api/admin/site-template",{
  method:"POST",headers:{Origin:origin,Cookie:cookie},
  body:new URLSearchParams({intent:"select",templateKey:sector}),redirect:"manual"
 });
 assert.equal(response.status,303);
 assert.match(response.headers.get("location")||"",/error=datos/,"Reject non-real-estate sector "+sector);
 assert.match(await (await get("/")).text(),/nexus-hero/,"Changing sector must not be possible");
}
assert.equal((await get("/propiedades")).status,200);
assert.equal((await get("/nosotros")).status,200);
assert.equal((await get("/servicios")).status,200);
assert.equal((await get("/contacto")).status,200);
const advisor=await get("/admin/personalizar/paginas/asesoria-empresarial",true);
assert.equal(advisor.status,200,"Business advisory editor remains available");
const unknown=execFileSync("curl",["-sS","-o","/dev/null","-w","%{http_code}","-H","Host: other-tenant.invalid",origin+"/"],{encoding:"utf8"}).trim();
assert.equal(unknown,"404","Tenant host isolation");
console.log("NEXUS: sector locked to real estate, property routes and advisory editor available.");
