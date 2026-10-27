import assert from "node:assert/strict";
import {execFileSync} from "node:child_process";

const origin=process.env.TEST_ORIGIN||"http://localhost:3000";
assert.equal(new URL(origin).hostname,"localhost","This test is restricted to isolated localhost.");

const loginBody=new FormData();
loginBody.set("email",process.env.ADMIN_EMAIL);
loginBody.set("password",process.env.ADMIN_PASSWORD);
const loggedIn=await fetch(origin+"/api/admin/session",{
 method:"POST",headers:{Origin:origin},body:loginBody,redirect:"manual"
});
assert.equal(loggedIn.status,303,"CRM test needs an administrator session.");
const cookie=loggedIn.headers.getSetCookie().find(x=>x.startsWith("webappecloud_session="))?.split(";")[0];
assert.ok(cookie,"Admin session cookie was not set.");

const auth={Cookie:cookie,Origin:origin};
const preflight=await fetch(origin+"/admin/leads",{headers:{Cookie:cookie}});
assert.equal(preflight.status,200);
const preflightHtml=await preflight.text();
if(preflightHtml.includes("Activar CRM de prospectos")){
 const wrongOrigin=await fetch(origin+"/api/admin/crm/activate",{method:"POST",headers:{Cookie:cookie,Origin:"https://foreign.invalid"},redirect:"manual"});
 assert.equal(wrongOrigin.status,303);
 assert.match(wrongOrigin.headers.get("location")||"",/error=origen/);
 const activated=await fetch(origin+"/api/admin/crm/activate",{method:"POST",headers:auth,redirect:"manual"});
 assert.equal(activated.status,303);
 assert.match(activated.headers.get("location")||"",/activated=1/);
}
const again=await fetch(origin+"/api/admin/crm/activate",{method:"POST",headers:auth,redirect:"manual"});
assert.equal(again.status,303,"CRM activation must be idempotent.");

const created=await fetch(origin+"/api/leads",{
 method:"POST",headers:{"Origin":origin,"Content-Type":"application/json"},
 body:JSON.stringify({name:"Contacto Seguimiento CI",phone:"88886666",email:"crm@example.test",
 message:"Consulta aislada para validar el seguimiento comercial.",consent:"yes"})
});
assert.equal(created.status,201,"Public form must still capture contacts.");
const list=await fetch(origin+"/admin/leads",{headers:{Cookie:cookie}});
assert.equal(list.status,200);
const html=await list.text();
assert.match(html,/Contacto Seguimiento CI/,"New contact absent in dashboard.");
const result=html.match(/href="\/admin\/leads\/([a-z0-9]{20,40})"/);
assert.ok(result,"Cannot locate link to a CRM lead.");
const leadId=result[1];
const form=new FormData();
form.set("intent","status");
form.set("status","contactado");
form.set("nextContactAt","2026-11-07");
const action=origin+"/api/admin/crm/leads/"+leadId;
const changed=await fetch(action,{method:"POST",headers:auth,body:form,redirect:"manual"});
assert.equal(changed.status,303);
assert.match(changed.headers.get("location")||"",/saved=1/);
const noteForm=new FormData();
noteForm.set("intent","note");
noteForm.set("body","Se realizó la primera llamada; contactar nuevamente la próxima semana.");
const added=await fetch(action,{method:"POST",headers:auth,body:noteForm,redirect:"manual"});
assert.equal(added.status,303);
assert.match(added.headers.get("location")||"",/noteSaved=1/);
const detail=await fetch(origin+"/admin/leads/"+leadId,{headers:{Cookie:cookie}});
assert.equal(detail.status,200);
const detailHtml=await detail.text();
assert.match(detailHtml,/primera llamada/,"Internal note absent.");
assert.match(detailHtml,/2026-11-07/,"Next contact date absent.");

const filtered=await fetch(origin+"/admin/leads?status=contactado",{headers:{Cookie:cookie}});
assert.equal(filtered.status,200);
assert.match(await filtered.text(),/Contacto Seguimiento CI/);

const invalid=new FormData();
invalid.set("intent","status");
invalid.set("status","inventado");
const invalidStatus=await fetch(action,{method:"POST",headers:auth,body:invalid,redirect:"manual"});
assert.equal(invalidStatus.status,303);
assert.match(invalidStatus.headers.get("location")||"",/error=estado/);
const forged=await fetch(action,{method:"POST",headers:{Cookie:cookie,Origin:"https://foreign.invalid"},body:form,redirect:"manual"});
assert.equal(forged.status,303);
assert.match(forged.headers.get("location")||"",/error=origen/);
const outsider=execFileSync("curl",["-sS","-o","/dev/null","-w","%{http_code}", "-H","Host: other-tenant.invalid","-H","Cookie: "+cookie,origin+"/admin/leads/"+leadId],{encoding:"utf8"}).trim();
assert.ok(["307","308","303","404"].includes(outsider),"Foreign tenant host unexpectedly reached lead details: "+outsider);
const anonymous=await fetch(origin+"/admin/leads/"+leadId,{redirect:"manual"});
assert.ok([303,307,308].includes(anonymous.status),"Anonymous prospect access should be blocked.");

// Record a WhatsApp contact manually. Clicking wa.me alone cannot reveal conversations.
const manual=new FormData();
manual.set("name","Contacto WhatsApp CI");
manual.set("phone","87654321");
manual.set("email","whatsapp@example.test");
manual.set("source","whatsapp");
manual.set("message","Consulta de WhatsApp registrada con consentimiento.");
manual.set("consent","on");
const manuallyCreated=await fetch(origin+"/api/admin/crm/leads",{method:"POST",headers:auth,body:manual,redirect:"manual"});
assert.equal(manuallyCreated.status,303);
assert.match(manuallyCreated.headers.get("location")||"",/\/admin\/leads\/[a-z0-9]+\?created=1/);
const withoutConsent=new FormData();
withoutConsent.set("name","Contacto sin permiso");
withoutConsent.set("phone","87654321");
withoutConsent.set("source","whatsapp");
const refused=await fetch(origin+"/api/admin/crm/leads",{method:"POST",headers:auth,body:withoutConsent,redirect:"manual"});
assert.equal(refused.status,303);
assert.match(refused.headers.get("location")||"",/error=consentimiento/);
console.log("CRM: activation, capture, manual WhatsApp intake, follow-up, notes, filters, consent and domain isolation passed.");
