import assert from "node:assert/strict";

const origin=process.env.TEST_ORIGIN||"http://localhost:3000";
assert.equal(new URL(origin).hostname,"localhost","Tests cannot target a production host.");
const email=process.env.ADMIN_EMAIL,password=process.env.ADMIN_PASSWORD;
assert.ok(email&&password,"Credentials for CI required.");
const login=await fetch(origin+"/api/admin/session",{
 method:"POST",headers:{Origin:origin},body:new URLSearchParams({email,password}),redirect:"manual"
});
assert.equal(login.status,303,"Login failed");
const cookie=login.headers.getSetCookie().find(x=>x.startsWith("webappecloud_session="))?.split(";")[0];
assert.ok(cookie,"Missing session cookie");
const get=(path,authenticated=false)=>fetch(origin+path,{headers:authenticated?{Cookie:cookie}:{},redirect:"manual"});
const post=(path,values)=>fetch(origin+path,{
 method:"POST",headers:{Origin:origin,Cookie:cookie},body:new URLSearchParams(values),redirect:"manual"
});
const select=async sector=>{
 const r=await post("/api/admin/site-template",{intent:"select",templateKey:sector});
 assert.equal(r.status,303);
 assert.match(r.headers.get("location")||"",/saved=1/);
};
const configure=async modules=>{
 const values=new URLSearchParams();
 for(const key of modules)values.append("modules",key);
 const r=await post("/api/admin/modules",values);
 assert.equal(r.status,303);
 assert.match(r.headers.get("location")||"",/saved=1/);
};
const all=["website","inquiries","properties","agenda","closings","analytics"];
const modulePage=await get("/admin/modulos",true);
assert.equal(modulePage.status,200);
assert.match(await modulePage.text(),/Aplicaciones y módulos/);
await configure(["website"]);
assert.ok((await (await get("/admin/modulos",true)).text()).includes("Desactivado"));
for(const path of ["/admin/propiedades","/admin/leads","/admin/agenda","/admin/cierres","/admin/reportes"]){
 const res=await get(path,true);
 assert.ok([303,307,308].includes(res.status),"Expected redirect for disabled "+path+" got "+res.status);
 assert.match(res.headers.get("location")||"",/\/admin\/modulos/);
}
assert.equal((await get("/propiedades")).status,404);
assert.equal((await get("/api/propiedades/casa-zona-ejecutiva/pdf")).status,404);
assert.equal((await get("/api/propiedades/casa-zona-ejecutiva/pdf-personalizado")).status,404);
const refused=await post("/api/admin/agenda",{leadId:"missing"});
assert.equal(refused.status,403);
const refusedReport=await get("/api/admin/reportes/csv",true);
assert.equal(refusedReport.status,403);
const refusedLead=await fetch(origin+"/api/leads",{
 method:"POST",headers:{Origin:origin,"Content-Type":"application/json"},
 body:JSON.stringify({name:"Solicitud bloqueada",phone:"88887777",consent:"yes"})
});
assert.equal(refusedLead.status,403);
await configure(all);
assert.equal((await get("/admin/propiedades",true)).status,200);
assert.equal((await get("/propiedades")).status,200);
await select("ecommerce");
assert.match(await (await get("/")).text(),/Tu marca, tu tienda digital/);
assert.ok((await (await get("/admin/modulos",true)).text()).includes("Catálogo de productos"));
assert.equal((await get("/propiedades")).status,404);
await select("education");
assert.ok((await (await get("/admin/modulos",true)).text()).includes("Conexión con Moodle"));
const attempted=await post("/api/admin/modules",{modules:"moodle"});
assert.equal(attempted.status,303);
assert.match(attempted.headers.get("location")||"",/error=datos/);
await select("real-estate");
assert.equal((await get("/propiedades")).status,200);
console.log("Tenant modules: enable/disable, protected routes, ecommerce and education options passed.");
