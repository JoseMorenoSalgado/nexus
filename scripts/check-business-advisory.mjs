import assert from "node:assert/strict";
import sharp from "sharp";

const origin=process.env.TEST_ORIGIN||"http://localhost:3000";
assert.equal(new URL(origin).hostname,"localhost","Business advisory QA must run only on localhost.");

async function login(){
 const form=new FormData();
 form.set("email",process.env.ADMIN_EMAIL||"");
 form.set("password",process.env.ADMIN_PASSWORD||"");
 const r=await fetch(origin+"/api/admin/session",{method:"POST",headers:{Origin:origin},body:form,redirect:"manual"});
 assert.equal(r.status,303,"Admin login failed");
 const cookie=r.headers.getSetCookie().find(v=>v.startsWith("webappecloud_session="))?.split(";")[0];
 assert.ok(cookie,"Missing authenticated session");
 return {Cookie:cookie,Origin:origin};
}
const auth=await login();

const list=await fetch(origin+"/admin/personalizar/paginas",{headers:{Cookie:auth.Cookie}});
assert.equal(list.status,200);
const listHtml=await list.text();
assert.match(listHtml,/Asesoría Empresarial/);
assert.ok(listHtml.includes("cms-advisory-highlight"),"Advisory page must be prominent even while unpublished");
const filtered=await fetch(origin+"/admin/personalizar/paginas?estado=publicadas",{headers:{Cookie:auth.Cookie}});
assert.equal(filtered.status,200);
assert.ok((await filtered.text()).includes("cms-advisory-highlight"),"Advisory page must remain discoverable in Published filter");
const edit=await fetch(origin+"/admin/personalizar/paginas/asesoria-empresarial",{headers:{Cookie:auth.Cookie}});
assert.equal(edit.status,200,"Advisory content must be CMS-editable");
const editHtml=await edit.text();
assert.ok(editHtml.includes("Material informativo")&&editHtml.includes("Secciones adicionales")&&editHtml.includes("Imagen"),"Missing image editor for advisory");
assert.equal((await fetch(origin+"/asesoria-empresarial")).status,404,"Business advisory must opt in and stay unpublished by default");

const toggle=async published=>{
 const form=new FormData();
 form.set("intent","status");
 if(published)form.set("published","on");
 return fetch(origin+"/api/admin/site-pages/asesoria-empresarial",{
  method:"POST",headers:auth,body:form,redirect:"manual"
 });
};
const foreignToggle=await fetch(origin+"/api/admin/site-pages/asesoria-empresarial",{
 method:"POST",headers:{Cookie:auth.Cookie,Origin:"https://third-party.invalid"},
 body:new URLSearchParams({published:"on"}),redirect:"manual"
});
assert.match(foreignToggle.headers.get("location")||"",/error=origen/);
const publish=await toggle(true);
assert.equal(publish.status,303);
assert.match(publish.headers.get("location")||"",/saved=1/);

const published=await fetch(origin+"/asesoria-empresarial");
assert.equal(published.status,200,"Published compliance page must render");
const publicHtml=await published.text();
for(const expected of ["Auditoría externa de cumplimiento","Capacitación para sujetos obligados",
 "Ley N.º 977","Ley N.º 976","Solicita una","contact-form","uaf.gob.ni",
 "nexus-advisory-visual","solicitar-orientacion"]){
 assert.ok(publicHtml.includes(expected),"Advisory page missing content: "+expected);
}
const homeHtml=await (await fetch(origin+"/")).text();
assert.ok(homeHtml.includes("nexus-advisory-home")&&homeHtml.includes('href="/asesoria-empresarial"'),"Published service must appear on Home");
const servicesPublished=await (await fetch(origin+"/servicios")).text();
assert.ok(servicesPublished.includes("nexus-advisory-services-teaser"),"Published advisory must be discoverable from Services");
const image=await sharp({create:{width:1000,height:650,channels:3,background:"#dde7ef"}}).png().toBuffer();
const uploadForm=new FormData();
uploadForm.set("image",new Blob([image],{type:"image/png"}),"informacion-cumplimiento.png");
const uploaded=await fetch(origin+"/api/admin/site-pages/asesoria-empresarial/images",{
 method:"POST",headers:auth,body:uploadForm
});
assert.equal(uploaded.status,200,"Upload must be allowed for this builtin page");
const uploadJson=await uploaded.json();
assert.match(uploadJson.id,/^[a-f0-9]{32}$/);
const storedSection=[{id:"section-asesoria-2026",type:"image",imageId:uploadJson.id,
 alt:"Gráfico ilustrativo para la capacitación sobre prevención",caption:"Material informativo del servicio"}];
async function saveSections(sections){
 const form=new FormData();
 form.set("sections",JSON.stringify(sections));
 return fetch(origin+"/api/admin/site-extras/asesoria-empresarial",{
  method:"POST",headers:auth,body:form,redirect:"manual"
 });
}
const saved=await saveSections(storedSection);
assert.equal(saved.status,303);
assert.match(saved.headers.get("location")||"",/blocksSaved=1/);
const refreshed=await (await fetch(origin+"/asesoria-empresarial")).text();
assert.ok(refreshed.includes("Gráfico ilustrativo para la capacitación sobre prevención"),
 "Tenant-owned image did not render from CMS");
const imageResponse=await fetch(origin+"/api/site-page-images/asesoria-empresarial/"+uploadJson.id);
assert.equal(imageResponse.status,200,"Published page image not accessible");
assert.equal(imageResponse.headers.get("content-type"),"image/webp");
const restored=await saveSections([]);
assert.equal(restored.status,303);
const unpublish=await toggle(false);
assert.equal(unpublish.status,303);
assert.equal((await fetch(origin+"/asesoria-empresarial")).status,404,"Draft advisory must be 404");
assert.equal((await fetch(origin+"/api/site-page-images/asesoria-empresarial/"+uploadJson.id)).status,404,"Draft or removed images cannot be public");
const homeDraft=await (await fetch(origin+"/")).text();
assert.ok(!homeDraft.includes("nexus-advisory-home"),"Draft advisory promo must disappear from Home");
const servicesDraft=await (await fetch(origin+"/servicios")).text();
assert.ok(!servicesDraft.includes("nexus-advisory-services-teaser"),"Draft service must disappear from Services page");

const leadRequest={
 name:"Usuario pruebas asesoria",phone:"88887777",email:"cumplimiento@example.com",
 message:"Asesoría empresarial / solicitud de reunión — capacitación",consent:"yes"
};
const lead=await fetch(origin+"/api/leads",{
 method:"POST",headers:{Origin:origin,"Content-Type":"application/json"},
 body:JSON.stringify(leadRequest)
});
assert.equal(lead.status,201,"Consultation must feed existing tenant-scoped CRM");
console.log("Business advisory: opt-in publication, CMS image upload + WebP, Home link, draft privacy, CRM lead and CSRF passed.");
