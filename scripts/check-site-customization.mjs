import assert from "node:assert/strict";
import {execFileSync} from "node:child_process";
import sharp from "sharp";

const origin=process.env.TEST_ORIGIN||"http://localhost:3000";
assert.equal(new URL(origin).hostname,"localhost","Tests only run against localhost.");
const loginForm=new FormData();
loginForm.set("email",process.env.ADMIN_EMAIL);
loginForm.set("password",process.env.ADMIN_PASSWORD);
const login=await fetch(origin+"/api/admin/session",{method:"POST",headers:{Origin:origin},body:loginForm,redirect:"manual"});
assert.equal(login.status,303);
const cookie=login.headers.getSetCookie().find(x=>x.startsWith("webappecloud_session="))?.split(";")[0];
assert.ok(cookie,"Cannot authenticate the test administrator.");
const auth={Cookie:cookie,Origin:origin};
const edit=await fetch(origin+"/admin/personalizar",{headers:{Cookie:cookie}});
assert.equal(edit.status,200);
assert.match(await edit.text(),/Nueva página/);
const unknown=await fetch(origin+"/admin/personalizar",{redirect:"manual"});
assert.ok([303,307,308].includes(unknown.status),"Anonymous user may not access the editor.");

const form=new FormData();
const fields={
 heroEyebrow:"INMOBILIARIA NEXUS · NICARAGUA",
 heroHeading:"Tu futuro empieza aquí",
 heroHighlight:"Encuentra tu espacio ideal",
 heroDescription:"Descubre propiedades seleccionadas y asesoría personalizada en Managua y Nicaragua.",
 heroButton:"Ver inmuebles",
 sectionEyebrow:"CASAS Y APARTAMENTOS",
 sectionHeading:"Encuentra una propiedad",
 sectionHighlight:"a tu medida.",
 sectionDescription:"Nuestro catálogo de casas, terrenos y apartamentos disponibles.",
 aboutTitle:"Profesionales que te acompañan",
 aboutDescription:"Atención personalizada para invertir, alquilar o comprar vivienda.",
 contactHeading:"Habla con nuestra agencia",
 contactHighlight:"estamos contigo.",
 contactDescription:"Solicita información y te contactaremos pronto.",
 whatsapp:"88887777",
 contactEmail:"contacto@nexus.example",
 tagline:"Pensando en tu futuro",
 primaryColor:"#9C1A27"
};
for(const [name,value] of Object.entries(fields))form.set(name,value);
const forged=await fetch(origin+"/api/admin/site-settings",{method:"POST",headers:{Cookie:cookie,Origin:"https://not-your-domain.invalid"},body:form,redirect:"manual"});
assert.equal(forged.status,303);
assert.match(forged.headers.get("location")||"",/error=origen/,"CSRF form should be rejected.");
const saved=await fetch(origin+"/api/admin/site-settings",{method:"POST",headers:auth,body:form,redirect:"manual"});
assert.equal(saved.status,303);
assert.match(saved.headers.get("location")||"",/saved=1/);
const home=await fetch(origin+"/");
assert.equal(home.status,200);
const homepage=await home.text();
assert.match(homepage,/Tu futuro empieza aquí/);
assert.match(homepage,/Encuentra tu espacio ideal/);
assert.match(homepage,/contacto@nexus.example/);
assert.match(homepage,/Ver inmuebles/);
assert.match(homepage,/9C1A27/,"Custom corporate color absent from public HTML");
assert.ok(homepage.includes("50588887777"),"WhatsApp local number was not normalized.");

const create=new FormData();
for(const [key,value] of Object.entries({
 refCode:"NX-PERSONALIZAR-CI",title:"Casa personalizada de prueba",city:"Managua",neighborhood:"Las Colinas",
 type:"Casa",operation:"venta",price:"159000",areaM2:"200",bedrooms:"3",bathrooms:"2",
 description:"Inmueble de prueba dedicado a verificar la portada y propiedades destacadas."
}))create.set(key,value);
create.set("published","on");
const added=await fetch(origin+"/api/admin/properties",{method:"POST",headers:auth,body:create,redirect:"manual"});
assert.equal(added.status,303);
const id=new URL(added.headers.get("location"),origin).pathname.match(/\/admin\/propiedades\/([a-z0-9]+)\/editar/)?.[1];
assert.ok(id,"Unable to register the test property.");
form.set("featuredIds",id);
const feature=await fetch(origin+"/api/admin/site-settings",{method:"POST",headers:auth,body:form,redirect:"manual"});
assert.equal(feature.status,303);
assert.match(feature.headers.get("location")||"",/saved=1/);
assert.match(await (await fetch(origin+"/")).text(),/Casa personalizada de prueba/);

const img=await sharp({create:{width:640,height:360,channels:3,background:"#a2a2a2"}}).png().toBuffer();
for(const kind of ["hero","logo"]){
 const invalid=new FormData();
 invalid.append("image",new Blob([Buffer.alloc(140,65)],{type:"application/pdf"}),"malicious.pdf");
 const denied=await fetch(origin+"/api/admin/site-media/"+kind,{method:"POST",headers:auth,body:invalid});
 assert.equal(denied.status,415);
 const upload=new FormData();
 upload.append("image",new Blob([img],{type:"image/png"}),kind+".png");
 const changed=await fetch(origin+"/api/admin/site-media/"+kind,{method:"POST",headers:auth,body:upload});
 assert.equal(changed.status,200,kind+" upload: "+(await changed.text()));
 const available=await fetch(origin+"/api/site-media/"+kind);
 assert.equal(available.status,200);
 assert.equal(available.headers.get("content-type"),"image/webp");
 const foreign=execFileSync("curl",["-sS","-o","/dev/null","-w","%{http_code}","-H","Host: foreign-tenant.invalid",origin+"/api/site-media/"+kind],{encoding:"utf8"}).trim();
 assert.equal(foreign,"404","Another host must not retrieve corporate images.");
 const cleared=await fetch(origin+"/api/admin/site-media/"+kind,{method:"DELETE",headers:auth});
 assert.equal(cleared.status,200,"Could not remove corporate photo.");
 assert.equal((await fetch(origin+"/api/site-media/"+kind)).status,404);
}
console.log("Site customization: auth, CSRF, text, WhatsApp, corporate color, featured listings, safe images, tenant isolation passed.");
