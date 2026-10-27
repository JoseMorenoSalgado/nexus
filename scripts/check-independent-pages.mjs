import assert from "node:assert/strict";
const origin=process.env.TEST_ORIGIN||"http://localhost:3000";
assert.equal(new URL(origin).hostname,"localhost");
const credentials=new FormData();
credentials.set("email",process.env.ADMIN_EMAIL);
credentials.set("password",process.env.ADMIN_PASSWORD);
const login=await fetch(origin+"/api/admin/session",{method:"POST",headers:{Origin:origin},body:credentials,redirect:"manual"});
assert.equal(login.status,303);
const cookie=login.headers.getSetCookie().find(v=>v.startsWith("webappecloud_session="))?.split(";")[0];
assert.ok(cookie);
const auth={Cookie:cookie,Origin:origin};
const entry=await fetch(origin+"/admin/personalizar",{headers:{Cookie:cookie},redirect:"manual"});
assert.ok([303,307,308].includes(entry.status),"Personalizar should open compact page list.");
assert.match(entry.headers.get("location")||"",/\/admin\/personalizar\/paginas/);
const list=await fetch(origin+"/admin/personalizar/paginas",{headers:{Cookie:cookie}});
assert.equal(list.status,200);
const html=await list.text();
for(const text of ["Páginas","Nueva página","Menú principal","Identidad visual","Inicio","Nosotros","Servicios","Contacto"]){
 assert.ok(html.includes(text),"Missing management action "+text);
}
assert.ok(html.includes('href="/admin/personalizar/paginas/nueva"'),"New page creation must be visible");
for(const section of ["home","propiedades","nosotros","servicios","contacto"]){
 const url="/admin/personalizar/paginas/"+section;
 const page=await fetch(origin+url,{headers:{Cookie:cookie}});
 assert.equal(page.status,200,"Cannot edit "+section);
 const markup=await page.text();
 assert.match(markup,new RegExp('value="'+section+'"'),"Section form incorrectly configured");
 assert.ok(markup.includes("Guardar esta página"),"Independent save action missing");
}
const homeEdit=await (await fetch(origin+"/admin/personalizar/paginas/home",{headers:{Cookie:cookie}})).text();
assert.ok(homeEdit.includes('name="heroHeading"')&&!homeEdit.includes('name="aboutMission"')&&!homeEdit.includes('name="servicesRent"'));
const aboutEdit=await (await fetch(origin+"/admin/personalizar/paginas/nosotros",{headers:{Cookie:cookie}})).text();
assert.ok(aboutEdit.includes('name="aboutMission"')&&!aboutEdit.includes('name="heroHeading"')&&!aboutEdit.includes('name="servicesSale"'));
const contactEdit=await (await fetch(origin+"/admin/personalizar/paginas/contacto",{headers:{Cookie:cookie}})).text();
assert.ok(contactEdit.includes('name="contactEmail"')&&!contactEdit.includes('name="aboutMission"'));
const identity=await (await fetch(origin+"/admin/personalizar/identidad",{headers:{Cookie:cookie}})).text();
assert.ok(identity.includes('name="primaryColor"')&&!identity.includes('name="heroHeading"'));
const beforeHome=await (await fetch(origin+"/")).text();
const beforeServices=await (await fetch(origin+"/servicios")).text();
const beforeContacts=await (await fetch(origin+"/contacto")).text();
const beforeAbout=await (await fetch(origin+"/nosotros")).text();
const savedMission="MISIÓN SEGMENTADA 2026: acompañar de forma clara y profesional.";
const about=new FormData();
about.set("section","nosotros");
about.set("aboutTitle","Asesoría profesional inmobiliaria");
about.set("aboutDescription","Información clara para quienes desean comprar o alquilar.");
about.set("aboutMission",savedMission);
about.set("aboutVision","Atención transparente a nivel nacional para cada cliente.");
const malicious=await fetch(origin+"/api/admin/site-section",{method:"POST",headers:{Cookie:cookie,Origin:"https://unknown.invalid"},body:about,redirect:"manual"});
assert.equal(malicious.status,303);assert.match(malicious.headers.get("location")||"",/error=origen/);
const saved=await fetch(origin+"/api/admin/site-section",{method:"POST",headers:auth,body:about,redirect:"manual"});
assert.equal(saved.status,303);assert.match(saved.headers.get("location")||"",/paginas\/nosotros\?saved=1/);
const aboutAfter=await (await fetch(origin+"/nosotros")).text();
assert.ok(aboutAfter.includes(savedMission),"Independent About changes not visible");
const homeAfter=await (await fetch(origin+"/")).text();
assert.ok(homeAfter.includes("Tu nuevo hogar comienza"),"Editing About overwrote Home heading");
assert.ok(beforeServices.includes("Servicios inmobiliarios a tu alcance")===
 (await (await fetch(origin+"/servicios")).text()).includes("Servicios inmobiliarios a tu alcance"),
 "Editing About overwrote Services");
assert.ok(beforeContacts.includes("Estamos para ayudarte")===
 (await (await fetch(origin+"/contacto")).text()).includes("Estamos para ayudarte"),
 "Editing About overwrote contact content");
const brand=new FormData();
brand.set("section","identidad");brand.set("tagline","Nueva identidad de prueba");
brand.set("primaryColor","#81202F");
const updatedBrand=await fetch(origin+"/api/admin/site-section",{method:"POST",headers:auth,body:brand,redirect:"manual"});
assert.equal(updatedBrand.status,303);assert.match(updatedBrand.headers.get("location")||"",/identidad\?saved=1/);
const newHome=await (await fetch(origin+"/")).text();
assert.ok(newHome.includes("Nueva identidad de prueba"),"Identity not applied");
assert.ok(newHome.includes("Tu nuevo hogar comienza"),"Identity update overwrote Home");
const invalidBrand=new FormData();
invalidBrand.set("section","identidad");invalidBrand.set("tagline","Color demasiado claro");
invalidBrand.set("primaryColor","#FFFFFF");
const bad=await fetch(origin+"/api/admin/site-section",{method:"POST",headers:auth,body:invalidBrand,redirect:"manual"});
assert.match(bad.headers.get("location")||"",/error=datos/);
const invalidSection=new FormData();
invalidSection.set("section","otro");
const rejected=await fetch(origin+"/api/admin/site-section",{method:"POST",headers:auth,body:invalidSection,redirect:"manual"});
assert.match(rejected.headers.get("location")||"",/error=datos/);
console.log("Independent page editors: compact list, new page, dedicated fields, persistence, CSRF, brand validated.");
