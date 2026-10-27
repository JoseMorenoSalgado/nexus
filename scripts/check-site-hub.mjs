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
assert.match(overview,/Prepara tu sitio/);
assert.match(overview,/Cómo se publica una página/);
for(const path of ["/admin/personalizar/paginas","/admin/personalizar/menu","/admin/personalizar/identidad","/admin/personalizar/plantilla"]){
 assert.ok(overview.includes(path),"Missing shortcut to "+path);
}
assert.match(overview,/Tu espacio de trabajo/);
assert.match(overview,/Estado de configuración/);
assert.match(overview,/página/);
const pages=await get("/admin/personalizar/paginas");
assert.match(pages,/Publicar y mostrar en el men/);
assert.ok(pages.includes("Pasar a borrador"),"Unpublish must be a clear action");
assert.ok(pages.includes("Mi sitio web"),"Overview shortcut missing");
const select=async key=>{
 const res=await fetch(origin+"/api/admin/site-template",{method:"POST",
  headers:{Cookie:cookie,Origin:origin},
  body:new URLSearchParams({intent:"select",templateKey:key}),redirect:"manual"});
 assert.equal(res.status,303,"Could not switch sector");
};
await select("education");
const school=await get("/admin/personalizar/paginas");
assert.match(school,/Página de la plantilla/);
assert.ok(school.includes('href="/admin/personalizar/paginas/home"'),"Education pages must open their independent section editor");
const schoolHome=await get("/admin/personalizar/paginas/home");
assert.ok(schoolHome.includes("Editar textos de plantilla")&&schoolHome.includes("Secciones adicionales"),"Education home must provide template and blocks editing");
const eduOverview=await get("/admin/personalizar/inicio");
assert.match(eduOverview,/Tipo de sitio:/);
assert.match(eduOverview,/Educación/);
await select("real-estate");
const after=await get("/admin/personalizar/paginas");
assert.ok(after.includes("Pasar a borrador"),"Existing real-estate management must be preserved");
const outsider=await fetch(origin+"/admin/personalizar/inicio",{redirect:"manual"});
assert.ok([303,307,308].includes(outsider.status),"Overview must require authentication");
console.log("CMS guide: tenant overview, discoverable tools, publication semantics and sector-specific editing passed.");
