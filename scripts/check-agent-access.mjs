import assert from "node:assert/strict";

const origin=process.env.TEST_ORIGIN||"http://localhost:3000";
assert.equal(new URL(origin).hostname,"localhost","Agent tests are restricted to localhost CI.");
const user=process.env.ADMIN_EMAIL,password=process.env.ADMIN_PASSWORD;
async function login(email,pass){
 const form=new FormData();form.set("email",email);form.set("password",pass);
 const response=await fetch(origin+"/api/admin/session",{method:"POST",headers:{Origin:origin},body:form,redirect:"manual"});
 assert.equal(response.status,303,"Login failed for "+email);
 const cookie=response.headers.getSetCookie().find(s=>s.startsWith("webappecloud_session="));
 assert.ok(cookie,"Session cookie not created");
 return cookie.split(";")[0];
}
async function post(path,form,cookie){
 return fetch(origin+path,{method:"POST",headers:{Origin:origin,Cookie:cookie},body:form,redirect:"manual"});
}
async function page(path,cookie){
 return fetch(origin+path,{headers:{Cookie:cookie},redirect:"manual"});
}
const adminCookie=await login(user,password);
const suffix=Date.now().toString(36);
const agentEmail="agent-ci-"+suffix+"@example.test",agentPassword="very-long-test-agent-password-2026";
const addUser=new FormData();
addUser.set("intent","create");addUser.set("name","Agente CI "+suffix);
addUser.set("email",agentEmail);addUser.set("password",agentPassword);addUser.set("confirmPassword",agentPassword);
addUser.append("roles","agente");
const createdAgent=await post("/api/admin/users",addUser,adminCookie);
assert.equal(createdAgent.status,303);
assert.match(createdAgent.headers.get("location")||"",/status=creado/);
const directory=await page("/admin/clientes-agentes",adminCookie);
assert.equal(directory.status,200);
const directoryHtml=await directory.text();
assert.ok(directoryHtml.includes(agentEmail));
const agentMatch=directoryHtml.slice(directoryHtml.indexOf(agentEmail),directoryHtml.indexOf(agentEmail)+1500).match(/href="\/admin\/clientes-agentes\/agentes\/([a-z0-9]{20,40})"/);
assert.ok(agentMatch,"Agent profile link missing");
const agentId=agentMatch[1];
const property=new FormData();
for(const [key,value] of Object.entries({
 title:"Casa asignada al agente CI "+suffix,refCode:"CI-"+suffix.toUpperCase(),
 city:"Ciudad de pruebas",neighborhood:"Prueba",description:"Inmueble para validar permisos de agente en integración.",
 type:"Casa",operation:"venta",price:"50000",bedrooms:"3",bathrooms:"2",areaM2:"120",assignedAgentId:agentId
}))property.set(key,value);
property.set("published","on");
const createdProperty=await post("/api/admin/properties",property,adminCookie);
assert.equal(createdProperty.status,303);
assert.match(createdProperty.headers.get("location")||"",/created=1/);
const detailAgent=await page("/admin/clientes-agentes/agentes/"+agentId,adminCookie);
assert.equal(detailAgent.status,200);
assert.match(await detailAgent.text(),/Casa asignada al agente CI/);
function leadForm(name,propertyId=""){
 const body=new FormData();body.set("name",name);body.set("phone","88887777");body.set("source","telefono");
 body.set("consent","on");body.set("message","Validación autorizada de acceso comercial.");
 if(propertyId)body.set("propertyId",propertyId);
 return body;
}
const propertyId=new URL(createdProperty.headers.get("location"),origin).pathname.match(/\/propiedades\/([a-z0-9]+)\/editar/)?.[1];
assert.ok(propertyId);
// Un gestor puede registrar un prospecto desde la propiedad sin volver a buscarla.
const adminPrefill=await page("/admin/leads/nuevo?propertyId="+encodeURIComponent(propertyId),adminCookie);
assert.equal(adminPrefill.status,200);
const adminPrefillHtml=await adminPrefill.text();
assert.match(adminPrefillHtml,new RegExp('<option[^>]*value="'+propertyId+'"[^>]*selected'),"La propiedad autorizada debe quedar preseleccionada");
const lead1=await post("/api/admin/crm/leads",leadForm("Cliente asignado CI "+suffix,propertyId),adminCookie);
assert.equal(lead1.status,303);
const ownedId=new URL(lead1.headers.get("location"),origin).pathname.split("/").at(-1);
const lead2=await post("/api/admin/crm/leads",leadForm("Cliente privado CI "+suffix),adminCookie);
assert.equal(lead2.status,303);
const otherId=new URL(lead2.headers.get("location"),origin).pathname.split("/").at(-1);
const agentCookie=await login(agentEmail,agentPassword);
const agentHome=await page("/admin",agentCookie);
assert.equal(agentHome.status,200);
const homeText=await agentHome.text();
assert.match(homeText,/Mi espacio comercial/);
assert.ok(homeText.includes("Cliente asignado CI "+suffix));
assert.ok(!homeText.includes("Cliente privado CI "+suffix));
const agentPrefill=await page("/admin/leads/nuevo?propertyId="+encodeURIComponent(propertyId),agentCookie);
assert.equal(agentPrefill.status,200);
assert.match(await agentPrefill.text(),new RegExp('<option[^>]*value="'+propertyId+'"[^>]*selected'),"Un agente solo puede preseleccionar sus inmuebles");
const unauthorizedPrefill=await page("/admin/leads/nuevo?propertyId=property-not-owned",agentCookie);
assert.equal(unauthorizedPrefill.status,200);
assert.ok(!(await unauthorizedPrefill.text()).includes('value="property-not-owned" selected'),"Un agente no debe poder seleccionar otros inmuebles por URL");
const agentLeads=await page("/admin/leads",agentCookie);
assert.equal(agentLeads.status,200);
const leadsHtml=await agentLeads.text();
assert.ok(leadsHtml.includes("Cliente asignado CI "+suffix));
assert.ok(!leadsHtml.includes("Cliente privado CI "+suffix));
assert.equal((await page("/admin/leads/"+ownedId,agentCookie)).status,200);
assert.equal((await page("/admin/leads/"+otherId,agentCookie)).status,404);
const note=new FormData();note.set("intent","note");note.set("body","Nota autorizada del agente CI.");
const validNote=await post("/api/admin/crm/leads/"+ownedId,note,agentCookie);
assert.match(validNote.headers.get("location")||"",/noteSaved=1/);
const invalidNote=await post("/api/admin/crm/leads/"+otherId,note,agentCookie);
assert.match(invalidNote.headers.get("location")||"",/error=noexiste/);
const forbidden=await page("/admin/clientes-agentes",agentCookie);
assert.ok([303,307,308].includes(forbidden.status));
const ownProperty=await page("/admin/propiedades/"+propertyId+"/editar",agentCookie);
assert.equal(ownProperty.status,200,"An agent can edit an assigned property.");
const withoutAssignedProperty=await post("/api/admin/crm/leads",leadForm("Contacto sin inmueble"),agentCookie);
assert.match(withoutAssignedProperty.headers.get("location")||"",/created=1/);

// Public inquiries inherit a stable responsible agent when the property is submitted.
const webLeadName="Consulta web comercial CI "+suffix;
const publicLead=await fetch(origin+"/api/leads",{
 method:"POST",headers:{Origin:origin,"Content-Type":"application/json"},
 body:JSON.stringify({name:webLeadName,phone:"87776666",email:"prospecto-web@example.test",consent:"yes",
  propertyId,message:"Consulta de integración con propiedad asignada."})
});
assert.equal(publicLead.status,201,"Published property form must create a prospect.");
const webOwnedHtml=await (await page("/admin/leads",agentCookie)).text();
assert.ok(webOwnedHtml.includes(webLeadName),"Public inquiry was not assigned to property's agent.");
const secondEmail="agent-second-"+suffix+"@example.test";
const secondUser=new FormData();
secondUser.set("intent","create");secondUser.set("name","Agente Segundo "+suffix);
secondUser.set("email",secondEmail);secondUser.set("password",agentPassword);secondUser.set("confirmPassword",agentPassword);secondUser.append("roles","agente");
const createdSecond=await post("/api/admin/users",secondUser,adminCookie);
assert.match(createdSecond.headers.get("location")||"",/status=creado/);
const directoryAfter=await (await page("/admin/clientes-agentes",adminCookie)).text();
const secondIndex=directoryAfter.indexOf(secondEmail);
assert.ok(secondIndex>=0);
const secondMatch=directoryAfter.slice(secondIndex,secondIndex+1500).match(/href="\/admin\/clientes-agentes\/agentes\/([a-z0-9]{20,40})"/);
assert.ok(secondMatch);
const secondAgentId=secondMatch[1],secondCookie=await login(secondEmail,agentPassword);
const secondNoProperty=await post("/api/admin/crm/leads",leadForm("Agente sin inventario "+suffix),secondCookie);
assert.match(secondNoProperty.headers.get("location")||"",/created=1/,"Agent without properties must create a general lead.");

// Reassign the property. Its existing leads must retain their original owner.
property.set("intent","save");property.set("assignedAgentId",secondAgentId);
const movedProperty=await post("/api/admin/properties/"+propertyId,property,adminCookie);
assert.match(movedProperty.headers.get("location")||"",/saved=1/);
assert.equal((await page("/admin/propiedades/"+propertyId+"/editar",agentCookie)).status,404,"Previous agent must lose edit access.");
assert.equal((await page("/admin/leads/"+ownedId,agentCookie)).status,200,
 "Property reassignment should not take away existing lead ownership.");
assert.equal((await page("/admin/leads/"+ownedId,secondCookie)).status,404,
 "New property agent must not automatically inherit older leads.");

// Only administrators/editors can explicitly reassign a prospect, with an audit entry.
const assignForm=new FormData();assignForm.set("intent","assign");assignForm.set("assignedAgentId",secondAgentId);
const badTransfer=await post("/api/admin/crm/leads/"+ownedId,assignForm,agentCookie);
assert.match(badTransfer.headers.get("location")||"",/error=permisos/);
const transferred=await post("/api/admin/crm/leads/"+ownedId,assignForm,adminCookie);
assert.match(transferred.headers.get("location")||"",/assigned=1/);
assert.equal((await page("/admin/leads/"+ownedId,agentCookie)).status,404,
 "Previous owner must immediately lose lead access.");
assert.equal((await page("/admin/leads/"+ownedId,secondCookie)).status,200,
 "New owner must immediately gain access.");
const historyHtml=await (await page("/admin/leads/"+ownedId,adminCookie)).text();
assert.match(historyHtml,/Historial de asignaciones/);
assert.match(historyHtml,/Agente CI/);
assert.match(historyHtml,/Agente Segundo/);
const oldOwnerWrite=await post("/api/admin/crm/leads/"+ownedId,note,agentCookie);
assert.match(oldOwnerWrite.headers.get("location")||"",/error=noexiste/);

// General inquiries can be allocated to an agent without any linked property.
const allocateGeneral=new FormData();
allocateGeneral.set("intent","assign");allocateGeneral.set("assignedAgentId",agentId);
const generalTransferred=await post("/api/admin/crm/leads/"+otherId,allocateGeneral,adminCookie);
assert.match(generalTransferred.headers.get("location")||"",/assigned=1/);
assert.equal((await page("/admin/leads/"+otherId,agentCookie)).status,200);
assert.equal((await page("/admin/leads/"+otherId,secondCookie)).status,404);

const unassign=new FormData();unassign.set("intent","assign");unassign.set("assignedAgentId","");
const unassigned=await post("/api/admin/crm/leads/"+ownedId,unassign,adminCookie);
assert.match(unassigned.headers.get("location")||"",/assigned=1/);
assert.equal((await page("/admin/leads/"+ownedId,secondCookie)).status,404);
const unassignedHtml=await (await page("/admin/leads/"+ownedId,adminCookie)).text();
assert.match(unassignedHtml,/Sin agente asignado/);
console.log("Agent ownership is independent of properties; transfers, unassignment, audit history and tenant-scoped permissions passed.");

