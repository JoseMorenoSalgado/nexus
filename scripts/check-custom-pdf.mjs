// Full custom-PDF flow against CI's isolated localhost tenant and database.
import assert from "node:assert/strict";
import {PDFDocument,PDFName} from "pdf-lib";
import {execFileSync} from "node:child_process";

const origin=process.env.TEST_ORIGIN||"http://localhost:3000";
assert.equal(new URL(origin).hostname,"localhost","Tests must not run against public sites.");

const credentials=new FormData();
credentials.set("email",process.env.ADMIN_EMAIL);
credentials.set("password",process.env.ADMIN_PASSWORD);
const signedIn=await fetch(origin+"/api/admin/session",{method:"POST",headers:{Origin:origin},body:credentials,redirect:"manual"});
assert.equal(signedIn.status,303,"CI administrator must sign in.");
const cookie=signedIn.headers.getSetCookie().find(x=>x.startsWith("webappecloud_session="))?.split(";")[0];
assert.ok(cookie,"Missing administrator session.");
const authHeaders={Cookie:cookie,Origin:origin};

const data=new FormData();
const fields={
 refCode:"NX-PDF-CI",title:"Casa con PDF corporativo CI",city:"Managua",neighborhood:"Centro",
 type:"Casa",operation:"venta",price:"125000",bedrooms:"3",bathrooms:"2",
 areaM2:"115",description:"Inmueble de prueba en la ejecución aislada de GitHub Actions, con ficha personalizada."
};
for(const [key,value] of Object.entries(fields))data.set(key,value);
const created=await fetch(origin+"/api/admin/properties",{method:"POST",headers:authHeaders,body:data,redirect:"manual"});
assert.equal(created.status,303,"Property creation failed.");
const dest=new URL(created.headers.get("location"),origin);
const id=dest.pathname.match(/^\/admin\/propiedades\/([^/]+)\/editar$/)?.[1];
assert.ok(id,"Could not resolve the created property.");
const adminDoc=origin+"/api/admin/properties/"+id+"/document";
const publicDoc=origin+"/api/propiedades/casa-con-pdf-corporativo-ci-nx-pdf-ci/pdf-personalizado";

const missing=await fetch(adminDoc,{headers:{Cookie:cookie}});
assert.equal(missing.status,404,"Missing document should return 404.");

const invalidForm=new FormData();
invalidForm.set("document",new Blob([Buffer.from("%PDF-1.7 garbage %%EOF")],{type:"application/pdf"}),"invalid.pdf");
const invalid=await fetch(adminDoc,{method:"POST",headers:authHeaders,body:invalidForm});
assert.equal(invalid.status,413,"Too small/invalid PDFs must be rejected.");

const source=await PDFDocument.create();
source.addPage([595,842]).drawText("Ficha corporativa CI - inmueble de prueba.");
source.catalog.set(PDFName.of("OpenAction"),PDFName.of("JavaScript"));
const bytes=await source.save();
const uploadBody=new FormData();
uploadBody.append("document",new Blob([bytes],{type:"application/pdf"}),"propiedad.pdf");
const uploaded=await fetch(adminDoc,{method:"POST",headers:authHeaders,body:uploadBody});
assert.equal(uploaded.status,200,"Valid custom PDF must upload: "+(await uploaded.text()));
const downloaded=await fetch(adminDoc,{headers:{Cookie:cookie}});
assert.equal(downloaded.status,200,"Admin must download PDFs on draft properties.");
assert.match(downloaded.headers.get("content-disposition")||"",/attachment/i);
assert.match(downloaded.headers.get("cache-control")||"",/no-store/i);
const clean=await PDFDocument.load(await downloaded.arrayBuffer());
assert.equal(clean.getPageCount(),1);
assert.equal(clean.catalog.get(PDFName.of("OpenAction")),undefined,"Embedded PDF actions must be removed.");

assert.equal((await fetch(publicDoc)).status,404,"Draft PDF must not be public.");
const publish=new FormData();publish.set("intent","publish");
const published=await fetch(origin+"/api/admin/properties/"+id,{method:"POST",body:publish,headers:authHeaders,redirect:"manual"});
assert.equal(published.status,303);
assert.equal((await fetch(publicDoc)).status,200,"Published personalized PDF should be downloadable.");
const foreignStatus=execFileSync("curl",[
 "-sS","-o","/dev/null","-w","%{http_code}","-H","Host: other-tenant.test",
 "-H","X-Forwarded-Host: other-tenant.test",publicDoc
],{encoding:"utf8"}).trim();
assert.equal(foreignStatus,"404","Foreign domains must not access the PDF.");
const auto=await fetch(origin+"/api/propiedades/casa-con-pdf-corporativo-ci-nx-pdf-ci/pdf");
assert.equal(auto.status,200,"Automatic PDF must stay available.");

const deleted=await fetch(adminDoc,{method:"DELETE",headers:authHeaders});
assert.equal(deleted.status,200);
assert.equal((await fetch(publicDoc)).status,404,"Removed personalized PDFs must not remain public.");
assert.equal((await fetch(origin+"/api/propiedades/casa-con-pdf-corporativo-ci-nx-pdf-ci/pdf")).status,200,"Automatic PDF remains available.");
console.log("Custom PDF: upload, sanitization, private drafts, publication, tenant isolation, deletion and automatic brochure passed.");
