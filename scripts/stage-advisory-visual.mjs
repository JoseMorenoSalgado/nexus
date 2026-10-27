/** Toggle advisory only for ephemeral localhost CI screenshots. Never use production. */
import assert from "node:assert/strict";
const action=process.argv[2];
assert.ok(action==="publish"||action==="draft","Use publish/draft");
const origin=process.env.TEST_ORIGIN||"http://localhost:3000";
assert.equal(new URL(origin).hostname,"localhost","Do not change production publishing status");
const form=new FormData();
form.set("email",process.env.ADMIN_EMAIL||"");
form.set("password",process.env.ADMIN_PASSWORD||"");
const login=await fetch(origin+"/api/admin/session",{method:"POST",headers:{Origin:origin},body:form,redirect:"manual"});
assert.equal(login.status,303);
const cookie=login.headers.getSetCookie().find(s=>s.startsWith("webappecloud_session="))?.split(";")[0];
assert.ok(cookie);
const data=new FormData();
data.set("intent","status");
if(action==="publish")data.set("published","on");
const toggle=await fetch(origin+"/api/admin/site-pages/asesoria-empresarial",{
 method:"POST",headers:{Cookie:cookie,Origin:origin},body:data,redirect:"manual"
});
assert.equal(toggle.status,303);
assert.match(toggle.headers.get("location")||"",/saved=1/);
const site=await fetch(origin+"/asesoria-empresarial");
assert.equal(site.status,action==="publish"?200:404,"Advisory visibility mismatch");
console.log("Ephemeral CI advisory status: "+action);
