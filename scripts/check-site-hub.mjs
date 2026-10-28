import assert from "node:assert/strict";

const origin=process.env.TEST_ORIGIN||"http://localhost:3000";
assert.equal(new URL(origin).hostname,"localhost","CMS guide tests run only on localhost");
const body=new URLSearchParams({email:process.env.ADMIN_EMAIL||"",password:process.env.ADMIN_PASSWORD||""});
const login=await fetch(origin+"/api/admin/session",{method:"POST",headers:{Origin:origin},body,redirect:"manual"});
assert.equal(login.status,303,"Admin login required");
const cookie=login.headers.getSetCookie().find(x=>x.startsWith("webappecloud_session="))?.split(";")[0];
assert.ok(cookie,"Missing admin session");
const get=async path=>{
 const res=await fetch(origin+path,{headers:{Cookie:cookie},redirect:"manual"});
 assert.equal(res.status,200,"Expected page "+path);
 return res.text();
};
const overview=await get("/admin/personalizar/inicio");
assert.match(overview,/Mi sitio web/);
assert.match(overview,/Marca y contacto/,"Identidad accesible desde el sitio web");
assert.match(overview,/Prepara tu sitio/);
assert.match(overview,/Editar portada/);
assert.match(overview,/Nueva página/);
assert.ok(!overview.includes("Ver diseño inmobiliario"),"Evitar pantallas informativas redundantes");
for(const path of ["/admin/personalizar/paginas","/admin/personalizar/menu","/admin/personalizar/identidad","/admin/personalizar/paginas/home","/admin/personalizar/paginas/nueva"]){
 assert.ok(overview.includes(path),"Missing shortcut to "+path);
}
assert.match(overview,/Tu espacio de trabajo/);
assert.match(overview,/Estado de configuración/);
assert.match(overview,/página/);
const pages=await get("/admin/personalizar/paginas");
assert.match(pages,/Publicar y mostrar en el men/);
assert.ok(pages.includes("Pasar a borrador"),"Unpublish must be a clear action");
assert.ok(pages.includes("Mi sitio web"),"Overview shortcut missing");
for(const path of ["/admin/personalizar/plantilla","/admin/personalizar","/admin/personalizar/contenido"]){
 const legacy=await fetch(origin+path,{headers:{Cookie:cookie},redirect:"manual"});
 assert.ok([303,307,308].includes(legacy.status),"Ruta heredada debe redirigir: "+path);
 assert.equal(legacy.headers.get("location"),"/admin/personalizar/inicio","Ruta heredada no abre Mi sitio web: "+path);
}
const advisor=await get("/admin/personalizar/paginas/asesoria-empresarial");
assert.match(advisor,/Asesoría Empresarial/);
const outsider=await fetch(origin+"/admin/personalizar/inicio",{redirect:"manual"});
assert.ok([303,307,308].includes(outsider.status),"Overview must require authentication");
console.log("CMS guide: tenant overview, discoverable tools, publication semantics and real-estate editing passed.");
