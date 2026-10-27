import assert from "node:assert/strict";
import {execFileSync} from "node:child_process";
const origin=process.env.TEST_ORIGIN||"http://localhost:3000";
assert.equal(new URL(origin).hostname,"localhost","The test must use an isolated localhost server.");
const loginBody=new FormData();
loginBody.set("email",process.env.ADMIN_EMAIL);
loginBody.set("password",process.env.ADMIN_PASSWORD);
const login=await fetch(origin+"/api/admin/session",{method:"POST",headers:{Origin:origin},body:loginBody,redirect:"manual"});
assert.equal(login.status,303);
const cookie=login.headers.getSetCookie().find(c=>c.startsWith("webappecloud_session="))?.split(";")[0];
assert.ok(cookie);
const auth={Cookie:cookie,Origin:origin};
for(const page of ["/admin/reportes","/api/admin/reportes/csv?periodo=30"]){
 const unauth=await fetch(origin+page,{redirect:"manual"});
 assert.ok([303,307,308].includes(unauth.status),"Unauthenticated reports must redirect");
}
const dangerTitle='=HYPERLINK("https://invalid.example","unsafe") Reporte CI';
const ref="NX-REPORT-CI";
const values={refCode:ref,title:dangerTitle,city:"Managua",neighborhood:"Las Colinas",
 type:"Casa",operation:"venta",price:"125000",areaM2:"140",bedrooms:"3",bathrooms:"2",
 description:"Propiedad de ensayo para verificar estadísticas y exportación sin filtración de datos."};
const form=new FormData();
for(const [key,value] of Object.entries(values))form.set(key,value);
form.set("published","on");
const created=await fetch(origin+"/api/admin/properties",{method:"POST",headers:auth,body:form,redirect:"manual"});
assert.equal(created.status,303);
const href=new URL(created.headers.get("location"),origin);
const id=href.pathname.match(/^\/admin\/propiedades\/([a-z0-9]+)\/editar$/)?.[1];
assert.ok(id,"Property creation failed");
const slug=dangerTitle.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,75)+"-"+ref.toLowerCase();
for(const kind of ["view","view","whatsapp"]){
 const event=await fetch(origin+"/api/events",{method:"POST",headers:{Origin:origin,"Content-Type":"application/json"},body:JSON.stringify({kind,path:"/propiedades/"+slug})});
 assert.equal(event.status,201,"Event not logged");
}
const lead=await fetch(origin+"/api/leads",{method:"POST",headers:{Origin:origin,"Content-Type":"application/json"},
 body:JSON.stringify({name:"Persona Privada de Pruebas",phone:"88885555",email:"private-report-only@example.invalid",
 message:"Interés por la propiedad",propertyId:id,consent:"yes"})});
assert.equal(lead.status,201);
const report=await fetch(origin+"/admin/reportes?periodo=7",{headers:{Cookie:cookie}});
assert.equal(report.status,200);
const html=await report.text();
assert.match(html,/Reportes comerciales/);
assert.match(html,/NX-REPORT-CI/);
assert.match(html,/Consultas web/);
assert.match(html,/Clics en WhatsApp/);
const csv=await fetch(origin+"/api/admin/reportes/csv?periodo=7",{headers:{Cookie:cookie}});
assert.equal(csv.status,200);
assert.match(csv.headers.get("content-type")||"",/text\/csv/);
assert.match(csv.headers.get("content-disposition")||"",/attachment/);
assert.match(csv.headers.get("cache-control")||"",/no-store/);
const exportText=await csv.text();
assert.match(exportText,/NX-REPORT-CI/);
assert.ok(exportText.includes("'=HYPERLINK"),"CSV must neutralize formula-like property titles");
assert.ok(!exportText.includes("private-report-only@example.invalid"),"CSV must not expose lead email");
assert.ok(!exportText.includes("88885555"),"CSV must not expose lead phone");
const invalid=await fetch(origin+"/admin/reportes?periodo=730",{headers:{Cookie:cookie}});
assert.equal(invalid.status,200);
assert.ok((await invalid.text()).includes('class="selected" href="/admin/reportes?periodo=30"'),"Invalid date range must select the 30-day default");
const otherTenant=execFileSync("curl",["-sS","-o","/dev/null","-w","%{http_code}","-H","Host: other-tenant.invalid","-H","Cookie: "+cookie,origin+"/api/admin/reportes/csv"],{encoding:"utf8"}).trim();
assert.ok(["303","307","308","404"].includes(otherTenant),"Foreign tenant must not access reports");
console.log("Reports: tenant auth, period filters, events, property attribution, CSV escaping and privacy passed.");
