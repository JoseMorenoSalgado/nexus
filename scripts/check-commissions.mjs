import assert from "node:assert/strict";
import {PDFDocument} from "pdf-lib";
const origin=process.env.TEST_ORIGIN||"http://localhost:3000";
assert.equal(new URL(origin).hostname,"localhost","Commission tests must only run locally.");
async function get(path,cookie){return fetch(origin+path,{headers:{Cookie:cookie},redirect:"manual"});}
async function post(path,data,cookie){return fetch(origin+path,{method:"POST",headers:{Origin:origin,Cookie:cookie},body:data,redirect:"manual"});}
async function login(email,password){
 const body=new FormData();body.set("email",email);body.set("password",password);
 const r=await fetch(origin+"/api/admin/session",{method:"POST",headers:{Origin:origin},body,redirect:"manual"});
 assert.equal(r.status,303);
 const cookie=r.headers.getSetCookie().find(x=>x.startsWith("webappecloud_session="));
 assert.ok(cookie);return cookie.split(";")[0];
}
const admin=await login(process.env.ADMIN_EMAIL,process.env.ADMIN_PASSWORD);
const page=await get("/admin/cierres/comisiones",admin);assert.equal(page.status,200);
if((await page.text()).includes("Activar control de abonos")){
 const refused=await post("/api/admin/comisiones/activate",new FormData(),admin);
 assert.match(refused.headers.get("location")||"",/error=respaldo/);
 const backup=new FormData();backup.set("backupConfirmed","yes");
 const activated=await post("/api/admin/comisiones/activate",backup,admin);
 assert.match(activated.headers.get("location")||"",/activated=1/);
}
assert.match(await (await get("/admin/cierres/comisiones",admin)).text(),/Comisiones por agente/);
const code=Date.now().toString(36);
const person="Comision agente "+code,email="commission-"+code+"@example.test";
const password="Commission-agent-long-test-password-2026";
const createAgent=new FormData();createAgent.set("intent","create");createAgent.set("name",person);
createAgent.set("email",email);createAgent.set("password",password);createAgent.set("confirmPassword",password);createAgent.append("roles","agente");
assert.match((await post("/api/admin/users",createAgent,admin)).headers.get("location")||"",/status=creado/);
const directory=await (await get("/admin/clientes-agentes",admin)).text();
const index=directory.indexOf(email);assert.ok(index>=0);
const agentId=directory.slice(index,index+1500).match(/href="\/admin\/clientes-agentes\/agentes\/([a-z0-9]{20,40})"/)?.[1];
assert.ok(agentId);
const p=new FormData();
for(const [k,v] of Object.entries({title:"Propiedad comisión "+code,refCode:"COM-"+code.toUpperCase(),
 city:"Prueba",neighborhood:"Centro",description:"Propiedad para abonos de comisiones.",type:"Casa",
 operation:"venta",price:"50000",bedrooms:"2",bathrooms:"1",areaM2:"80",assignedAgentId:agentId}))p.set(k,v);
const prop=await post("/api/admin/properties",p,admin);
assert.match(prop.headers.get("location")||"",/created=1/);
const propertyId=new URL(prop.headers.get("location"),origin).pathname.match(/\/propiedades\/([a-z0-9]+)\/editar/)?.[1];assert.ok(propertyId);
const lead=new FormData();
lead.set("name","Cliente comisión "+code);lead.set("phone","88887777");lead.set("source","telefono");
lead.set("consent","on");lead.set("propertyId",propertyId);
const leadResult=await post("/api/admin/crm/leads",lead,admin);
const leadId=new URL(leadResult.headers.get("location"),origin).pathname.split("/").at(-1);assert.ok(leadId);
const closing=new FormData();
closing.set("leadId",leadId);closing.set("kind","venta");closing.set("closedAt",new Date().toISOString().slice(0,10));
closing.set("amount","50000.00");closing.set("commissionAmount","1500.00");
closing.set("agentId","auto");closing.set("notes","");
const closed=await post("/api/admin/cierres",closing,admin);
assert.match(closed.headers.get("location")||"",/created=1/);
const closingId=new URL(closed.headers.get("location"),origin).searchParams.get("cierre");assert.ok(closingId);
const agent=await login(email,password);
const agentPage=await (await get("/admin/cierres/comisiones",agent)).text();
assert.ok(agentPage.includes("Cliente comisión "+code));
function payment(amount){
 const f=new FormData();f.set("closingId",closingId);f.set("amount",amount);
 f.set("paidAt",new Date().toISOString().slice(0,10));f.set("method","transferencia");
 f.set("reference","Comprobante-"+code);f.set("notes","");
 return f;
}
assert.match((await post("/api/admin/comisiones",payment("400.00"),agent)).headers.get("location")||"",/error=permisos/);
assert.match((await post("/api/admin/comisiones",payment("400.00"),admin)).headers.get("location")||"",/created=1/);
let dashboard=await (await get("/admin/cierres/comisiones",admin)).text();
assert.ok(dashboard.includes("Pago parcial"),"Partial balance status not shown.");
assert.match((await post("/api/admin/comisiones",payment("1200.00"),admin)).headers.get("location")||"",/error=saldo/);
assert.match((await post("/api/admin/comisiones",payment("1100.00"),admin)).headers.get("location")||"",/created=1/);
dashboard=await (await get("/admin/cierres/comisiones",admin)).text();
assert.match(dashboard,/Pagada/);
const statement=await get("/api/admin/cierres/comisiones/pdf?periodo=30",agent);
assert.equal(statement.status,200);
const bytes=new Uint8Array(await statement.arrayBuffer());
assert.equal(new TextDecoder().decode(bytes.slice(0,5)),"%PDF-");
const pdf=await PDFDocument.load(bytes);
assert.ok(pdf.getPageCount()>=1);
const operations=await get("/api/admin/cierres/pdf?periodo=30",agent);
assert.equal(operations.status,200);
assert.equal(new TextDecoder().decode(new Uint8Array(await operations.arrayBuffer()).slice(0,5)),"%PDF-");
const voidClosing=new FormData();voidClosing.set("intent","void");
voidClosing.set("reason","Se cancela la operación por solicitud del cliente.");
assert.match((await post("/api/admin/cierres/"+closingId,voidClosing,admin)).headers.get("location")||"",/error=pagos/);
const history=await (await get("/admin/cierres/comisiones?periodo=30",admin)).text();
const ids=[...history.matchAll(/\/api\/admin\/comisiones\/([a-z0-9]{20,40})/g)].map(x=>x[1]);
assert.ok(ids.length>=2,"Installment IDs must be available in payment audit trail.");
const invalidVoid=new FormData();invalidVoid.set("intent","void");invalidVoid.set("reason","short");
assert.match((await post("/api/admin/comisiones/"+ids[0],invalidVoid,admin)).headers.get("location")||"",/error=motivo/);
const voidForm=new FormData();voidForm.set("intent","void");voidForm.set("reason","Corrección de transferencia duplicada por caja.");
assert.match((await post("/api/admin/comisiones/"+ids[0],voidForm,admin)).headers.get("location")||"",/voided=1/);
const afterVoid=await (await get("/admin/cierres/comisiones",admin)).text();
assert.ok(afterVoid.includes("Pago parcial"));
assert.ok(afterVoid.includes("Corrección de transferencia"));
const restricted=await get("/api/admin/cierres/comisiones/pdf?agente=invalid-tenant",agent);
assert.equal(restricted.status,200,"Agent must not be able to expand PDF access through query string.");
console.log("Commission ledger: partial/full payments, no overpayment, audit voids, PDF exports and role isolation passed.");
