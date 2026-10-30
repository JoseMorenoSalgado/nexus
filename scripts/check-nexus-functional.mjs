import assert from "node:assert/strict";
import {PrismaClient} from "@prisma/client";
import {PDFDocument} from "pdf-lib";
const origin=process.env.TEST_ORIGIN||"http://localhost:3000";
assert.equal(new URL(origin).hostname,"localhost","Integration tests may run only on localhost.");
const db=new PrismaClient();
async function post(url,form,cookie){
 return fetch(origin+url,{method:"POST",headers:{Origin:origin,...(cookie?{Cookie:cookie}:{})},body:form,redirect:"manual"});
}
async function get(url,cookie){
 return fetch(origin+url,{headers:cookie?{Cookie:cookie}:{},redirect:"manual"});
}
async function login(email,password){
 const body=new FormData();body.set("email",email);body.set("password",password);
 const result=await post("/api/admin/session",body);
 assert.equal(result.status,303);
 const cookie=result.headers.getSetCookie().find(v=>v.startsWith("webappecloud_session="))?.split(";")[0];
 assert.ok(cookie);return cookie;
}
function property(title){
 const data=new FormData();
 for(const [key,value] of Object.entries({title,city:"Managua",neighborhood:"Centro",
  description:("Descripción extensa y legible de la propiedad. ").repeat(70),
  type:"Casa",operation:"venta",price:"75000",bedrooms:"3",bathrooms:"2",areaM2:"132"}))data.set(key,value);
 return data;
}
function lead(name,source="facebook"){
 const form=new FormData();form.set("name",name);form.set("phone","88887777");
 form.set("source",source);form.set("consent","on");return form;
}
function idFrom(response,kind){
 return new URL(response.headers.get("location"),origin).pathname.match(new RegExp("/admin/"+kind+"/([a-z0-9]+)/"))?.[1];
}
try{
 const admin=await login(process.env.ADMIN_EMAIL,process.env.ADMIN_PASSWORD);
 const stamp=Date.now().toString(36);
 const email="functional-agent-"+stamp+"@example.test",pass="Secure-long-pass-12345";
 const wrong=new FormData();wrong.set("intent","create");wrong.set("name","Agente de prueba");
 wrong.set("email",email);wrong.set("password",pass);wrong.set("confirmPassword","otra-clave-999");
 wrong.append("roles","agente");
 assert.match((await post("/api/admin/users",wrong,admin)).headers.get("location")||"",/status=datos/);
 wrong.set("confirmPassword",pass);
 assert.match((await post("/api/admin/users",wrong,admin)).headers.get("location")||"",/status=creado/);
 const agentRow=await db.adminUser.findFirst({where:{email}});
 assert.ok(agentRow);
 const agent=await login(email,pass);
 const batch=await Promise.all(Array.from({length:4},(_,i)=>post("/api/admin/properties",property("Casa concurrente "+stamp+" número "+i),admin)));
 assert.ok(batch.every(r=>r.status===303&&(r.headers.get("location")||"").includes("created=1")));
 const ids=batch.map(r=>idFrom(r,"propiedades"));
 assert.ok(ids.every(Boolean));
 const created=await db.property.findMany({where:{id:{in:ids}}});
 assert.equal(created.length,4);
 const codes=created.map(x=>x.refCode);
 assert.equal(new Set(codes).size,4,"Atomic counter must prevent duplicate references.");
 assert.ok(codes.every(x=>/^NRE-\d{6,}$/.test(x)));
 const oldCode=created[0].refCode;
 const edit=property(created[0].title);edit.set("refCode","MALICIOUS-REPLACEMENT");edit.set("intent","save");
 assert.match((await post("/api/admin/properties/"+created[0].id,edit,admin)).headers.get("location")||"",/saved=1/);
 assert.equal((await db.property.findUnique({where:{id:created[0].id}})).refCode,oldCode,"Ref must be immutable.");
 const own=await post("/api/admin/properties",property("Casa propia del agente "+stamp),agent);
 assert.match(own.headers.get("location")||"",/created=1/);
 const ownedId=idFrom(own,"propiedades");assert.ok(ownedId);
 assert.equal((await db.property.findUnique({where:{id:ownedId}})).assignedAgentId,agentRow.id);
 assert.equal((await get("/admin/propiedades/"+ownedId+"/editar",agent)).status,200);
 assert.equal((await get("/admin/propiedades/"+created[0].id+"/editar",agent)).status,404);
 const alone=lead("Prospecto sin inventario "+stamp);alone.set("externalPropertyInterest","Casa anunciada en Marketplace, sin registro interno");
 const received=await post("/api/admin/crm/leads",alone,agent);
 assert.match(received.headers.get("location")||"",/created=1/);
 const leadId=idFrom(received,"leads");assert.ok(leadId);
 const record=await db.lead.findUnique({where:{id:leadId}});
 assert.equal(record.propertyId,null);assert.ok(record.externalPropertyInterest?.includes("Marketplace"));
 const association=new FormData();association.set("intent","property");association.set("propertyId",ownedId);
 association.set("externalPropertyInterest","");
 assert.match((await post("/api/admin/crm/leads/"+leadId,association,agent)).headers.get("location")||"",/propertySaved=1/);
 const changed=await db.lead.findUnique({where:{id:leadId},include:{propertyHistory:true}});
 assert.equal(changed.propertyId,ownedId);assert.equal(changed.propertyHistory.length,1);
 const denied=new FormData();denied.set("intent","property");denied.set("propertyId",created[0].id);
 denied.set("externalPropertyInterest","");
 assert.match((await post("/api/admin/crm/leads/"+leadId,denied,agent)).headers.get("location")||"",/error=propiedad/);
 const channel=lead("Fuente digital "+stamp,"instagram");
 assert.match((await post("/api/admin/crm/leads",channel,admin)).headers.get("location")||"",/created=1/);
 const report=await (await get("/admin/leads?source=instagram",admin)).text();
 assert.match(report,/Reporte de captación por canal/);
 const disable=new FormData();disable.set("intent","toggle");disable.set("code","tiktok");disable.set("active","false");
 assert.match((await post("/api/admin/crm/sources",disable,admin)).headers.get("location")||"",/status=guardado/);
 assert.match((await post("/api/admin/crm/leads",lead("Denegado por canal "+stamp,"tiktok"),admin)).headers.get("location")||"",/error=datos/);
 disable.set("active","true");
 assert.match((await post("/api/admin/crm/sources",disable,admin)).headers.get("location")||"",/status=guardado/);
 const full=created[0];
 const publish=new FormData();publish.set("intent","publish");
 assert.match((await post("/api/admin/properties/"+full.id,publish,admin)).headers.get("location")||"",/updated=1/);
 for(const [mode,maxPages] of [["resumida",1],["ampliada",2]]){
  const url="/api/propiedades/"+full.slug+"/pdf?formato="+mode+"&vista=1";
  const r=await get(url);assert.equal(r.status,200);
  assert.match(r.headers.get("content-disposition")||"",/inline/);
  const pdf=await PDFDocument.load(await r.arrayBuffer());
  assert.ok(pdf.getPageCount()>=1&&pdf.getPageCount()<=maxPages);
 }
 console.log("Functional Nexus: confirmed passwords, serializable references, owner-only access, optional leads, history, sources and 1-2 page PDFs passed.");
}finally{await db.$disconnect();}
