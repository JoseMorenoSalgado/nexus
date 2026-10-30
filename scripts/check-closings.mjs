import assert from "node:assert/strict";
const origin=process.env.TEST_ORIGIN||"http://localhost:3000";
assert.equal(new URL(origin).hostname,"localhost","Closings test must use isolated localhost.");
async function page(path,cookie){return fetch(origin+path,{headers:cookie?{Cookie:cookie}:{},redirect:"manual"});}
async function post(path,body,cookie){return fetch(origin+path,{method:"POST",headers:{Origin:origin,...(cookie?{Cookie:cookie}:{})},body,redirect:"manual"});}
async function login(email,password){
 const form=new FormData();form.set("email",email);form.set("password",password);
 const r=await post("/api/admin/session",form);assert.equal(r.status,303);
 const cookie=r.headers.getSetCookie().find(v=>v.startsWith("webappecloud_session="));
 assert.ok(cookie);return cookie.split(";")[0];
}
const cookie=await login(process.env.ADMIN_EMAIL,process.env.ADMIN_PASSWORD);
const first=await page("/admin/cierres",cookie);assert.equal(first.status,200);
if((await first.text()).includes("Activar registro de operaciones")){
 const denied=await post("/api/admin/cierres/activate",new FormData(),cookie);
 assert.match(denied.headers.get("location")||"",/error=respaldo/);
 const backup=new FormData();backup.set("backupConfirmed","yes");
 const activated=await post("/api/admin/cierres/activate",backup,cookie);
 assert.match(activated.headers.get("location")||"",/activated=1/);
}
const ready=await page("/admin/cierres",cookie);assert.equal(ready.status,200);
assert.match(await ready.text(),/Registrar venta o alquiler/);
const stamp=Date.now().toString(36);
const email="closing-agent-"+stamp+"@example.test",password="agent-long-password-closing-2026";
const account=new FormData();
account.set("intent","create");account.set("name","Asesor cierre CI "+stamp);
account.set("email",email);account.set("password",password);account.set("confirmPassword",password);account.append("roles","agente");
const accountResult=await post("/api/admin/users",account,cookie);
assert.match(accountResult.headers.get("location")||"",/status=creado/);
const directory=await (await page("/admin/clientes-agentes",cookie)).text();
const index=directory.indexOf(email);assert.ok(index>=0);
const agentId=directory.slice(index,index+1600).match(/href="\/admin\/clientes-agentes\/agentes\/([a-z0-9]{20,40})"/)?.[1];
assert.ok(agentId);
const property=new FormData();
for(const [key,value] of Object.entries({
 title:"Inmueble cierre CI "+stamp,refCode:"TX-"+stamp.toUpperCase(),city:"Ciudad de prueba",
 neighborhood:"Norte",description:"Propiedad creada para validar el registro financiero.",
 type:"Casa",operation:"venta",price:"100000",bedrooms:"2",bathrooms:"2",areaM2:"130",assignedAgentId:agentId
}))property.set(key,value);
const propertyCreated=await post("/api/admin/properties",property,cookie);
assert.match(propertyCreated.headers.get("location")||"",/created=1/);
const propertyId=new URL(propertyCreated.headers.get("location"),origin).pathname.match(/\/propiedades\/([a-z0-9]+)\/editar/)?.[1];
assert.ok(propertyId);
const lead=new FormData();
lead.set("name","Comprador de prueba "+stamp);lead.set("phone","88887777");
lead.set("source","telefono");lead.set("consent","on");lead.set("propertyId",propertyId);
const leadCreated=await post("/api/admin/crm/leads",lead,cookie);
assert.match(leadCreated.headers.get("location")||"",/created=1/);
const leadId=new URL(leadCreated.headers.get("location"),origin).pathname.split("/").at(-1);
function closing(leadId,kind="venta",amount="100000.00",commission="3000.00",agentChoice="auto"){
 const body=new FormData();
 body.set("leadId",leadId);body.set("kind",kind);
 body.set("closedAt",new Date().toISOString().slice(0,10));
 body.set("amount",amount);body.set("commissionAmount",commission);
 body.set("agentId",agentChoice);body.set("notes","Registro de integración de operación inmobiliaria.");
 return body;
}
const wrongKind=await post("/api/admin/cierres",closing(leadId,"alquiler"),cookie);
assert.match(wrongKind.headers.get("location")||"",/error=operacion/);
const invalidAmount=await post("/api/admin/cierres",closing(leadId,"venta","1.999"),cookie);
assert.match(invalidAmount.headers.get("location")||"",/error=datos/);
const wrongCommission=await post("/api/admin/cierres",closing(leadId,"venta","100.00","101.00"),cookie);
assert.match(wrongCommission.headers.get("location")||"",/error=comision/);
const created=await post("/api/admin/cierres",closing(leadId),cookie);
assert.equal(created.status,303);
assert.match(created.headers.get("location")||"",/created=1/);
const closingId=new URL(created.headers.get("location"),origin).searchParams.get("cierre");
assert.ok(closingId);
const duplicate=await post("/api/admin/cierres",closing(leadId),cookie);
assert.match(duplicate.headers.get("location")||"",/error=duplicado/);
const adminList=await (await page("/admin/cierres",cookie)).text();
assert.ok(adminList.includes("Comprador de prueba "+stamp));
assert.ok(adminList.includes("100,000")||adminList.includes("100.000"),"Amount missing from dashboard");
const agentCookie=await login(email,password);
const agentPage=await page("/admin/cierres",agentCookie);assert.equal(agentPage.status,200);
assert.ok((await agentPage.text()).includes("Comprador de prueba "+stamp));
const unauthorized=await post("/api/admin/cierres/"+closingId,new FormData(),agentCookie);
assert.match(unauthorized.headers.get("location")||"",/error=permisos/);
const csv=await page("/api/admin/cierres/csv?periodo=30",agentCookie);
assert.equal(csv.status,200);
assert.match(await csv.text(),/Comprador de prueba/);
const otherLead=new FormData();otherLead.set("name","Otro comprador "+stamp);
otherLead.set("phone","87776666");otherLead.set("source","telefono");otherLead.set("consent","on");
const plainLead=await post("/api/admin/crm/leads",otherLead,cookie);
const noPropertyId=new URL(plainLead.headers.get("location"),origin).pathname.split("/").at(-1);
const withoutProperty=await post("/api/admin/cierres",closing(noPropertyId),cookie);
assert.match(withoutProperty.headers.get("location")||"",/error=propiedad/);
const voidForm=new FormData();voidForm.set("intent","void");voidForm.set("reason","Contrato anulado por desistimiento de la operación.");
const voided=await post("/api/admin/cierres/"+closingId,voidForm,cookie);
assert.match(voided.headers.get("location")||"",/voided=1/);
const repeatVoid=await post("/api/admin/cierres/"+closingId,voidForm,cookie);
assert.match(repeatVoid.headers.get("location")||"",/error=noexiste/);
const audit=await (await page("/admin/cierres?estado=anulado",cookie)).text();
assert.ok(audit.includes("Contrato anulado por desistimiento"));
console.log("Closings: backup-gated activation, real money validation, duplicate prevention, commissions, CSV, role isolation and void history passed.");
