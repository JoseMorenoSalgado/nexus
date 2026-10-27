import assert from "node:assert/strict";
import {execFileSync} from "node:child_process";
import sharp from "sharp";
const origin=process.env.TEST_ORIGIN||"http://localhost:3000";
assert.equal(new URL(origin).hostname,"localhost","This suite only runs against CI localhost.");
const credentials=new FormData();
credentials.set("email",process.env.ADMIN_EMAIL);
credentials.set("password",process.env.ADMIN_PASSWORD);
const login=await fetch(origin+"/api/admin/session",{method:"POST",headers:{Origin:origin},body:credentials,redirect:"manual"});
assert.equal(login.status,303);
const cookie=login.headers.getSetCookie().find(s=>s.startsWith("webappecloud_session="))?.split(";")[0];
assert.ok(cookie,"Missing test admin cookie");
const auth={Cookie:cookie,Origin:origin};
const hub=await fetch(origin+"/admin/personalizar",{headers:{Cookie:cookie}});
assert.equal(hub.status,200);
assert.match(await hub.text(),/Menú principal/);
const pages=await fetch(origin+"/admin/personalizar/paginas",{headers:{Cookie:cookie}});
assert.equal(pages.status,200);
assert.match(await pages.text(),/Nueva página/);
const menuPage=await fetch(origin+"/admin/personalizar/menu",{headers:{Cookie:cookie}});
assert.equal(menuPage.status,200);
assert.match(await menuPage.text(),/Editar navegación/);
const other=await fetch(origin+"/admin/personalizar/menu",{redirect:"manual"});
assert.ok([303,307,308].includes(other.status),"Menu editor must require login");

const slug="guia-inmobiliaria-ci",title="Guía de prueba inmobiliaria";
const body="Primer párrafo sobre propiedades.\n\nSegundo párrafo con información adicional.";
const fields=new FormData();
fields.set("title",title);fields.set("slug",slug);
fields.set("summary","Guía informativa para el visitante.");
fields.set("body",body);
const created=await fetch(origin+"/api/admin/site-pages",{method:"POST",headers:auth,body:fields,redirect:"manual"});
assert.equal(created.status,303);
assert.match(created.headers.get("location")||"",/created=1/);
assert.equal((await fetch(origin+"/pagina/"+slug)).status,404,"Draft custom pages must not be public.");
const defaults=[
 {id:"home",label:"Inicio"},{id:"propiedades",label:"Propiedades"},{id:"nosotros",label:"Nosotros"},
 {id:"servicios",label:"Servicios"},{id:"contacto",label:"Contacto"}
];
async function setMenu(items,headers=auth){
 const form=new FormData();form.set("items",JSON.stringify(items));
 return fetch(origin+"/api/admin/site-menu",{method:"POST",headers,body:form,redirect:"manual"});
}
const draftInMenu=await setMenu([...defaults,{id:"pagina:"+slug,label:"Guía"}]);
assert.match(draftInMenu.headers.get("location")||"",/error=datos/,"Draft page must not be added to menu");
const toggle=async(page,published)=>{
 const form=new FormData();form.set("intent","status");
 if(published)form.set("published","on");
 return fetch(origin+"/api/admin/site-pages/"+page,{method:"POST",headers:auth,body:form,redirect:"manual"});
};
assert.equal((await toggle(slug,true)).status,303);
const published=await fetch(origin+"/pagina/"+slug);
assert.equal(published.status,200);
assert.match(await published.text(),/Primer párrafo sobre propiedades/);
const menu=[
 {id:"home",label:"Inicio"},
 {id:"pagina:"+slug,label:"Guía útil"},
 {id:"contacto",label:"Contáctanos"},
 {id:"propiedades",label:"Inmuebles"},
 {id:"nosotros",label:"La empresa"}
];
const save=await setMenu(menu);
assert.equal(save.status,303);
assert.match(save.headers.get("location")||"",/saved=1/);
const updatedHome=await (await fetch(origin+"/")).text();
for(const label of ["Guía útil","Contáctanos","Inmuebles","La empresa"])assert.ok(updatedHome.includes(label),"Missing menu label "+label);
const nav=updatedHome.match(/<nav class="nexus-nav-links"[^>]*>([\s\S]*?)<\/nav>/)?.[1]||"";
assert.ok(nav.indexOf("Guía útil")>nav.indexOf("Inicio")&&nav.indexOf("Guía útil")<nav.indexOf("Contáctanos"),"Saved ordering not reflected");
assert.ok(!nav.includes(">Servicios<"),"Removed item should disappear from navigation");
assert.equal((await fetch(origin+"/servicios")).status,200,"Removing a link must not unpublish its page");
const forbidden=await setMenu([...defaults,{id:"pagina:otra-empresa-ci",label:"No autorizado"}]);
assert.match(forbidden.headers.get("location")||"",/error=datos/);
const forged=await setMenu(defaults,{Cookie:cookie,Origin:"https://foreign.invalid"});
assert.match(forged.headers.get("location")||"",/error=origen/);
const editedFields=new FormData();
editedFields.set("title","Guía renovada");editedFields.set("summary","Contenido actualizado");
editedFields.set("body","Información nueva de la guía para usuarios.");editedFields.set("published","on");
const changed=await fetch(origin+"/api/admin/site-pages/"+slug,{method:"POST",headers:auth,body:editedFields,redirect:"manual"});
assert.match(changed.headers.get("location")||"",/saved=1/);
assert.match(await (await fetch(origin+"/pagina/"+slug)).text(),/Información nueva de la guía/);
await toggle("nosotros",false);
assert.equal((await fetch(origin+"/nosotros")).status,404,"A built-in draft must not be accessible.");
const afterHide=await (await fetch(origin+"/")).text();
const hiddenMenu=afterHide.match(/<nav class="nexus-nav-links"[^>]*>([\s\S]*?)<\/nav>/)?.[1]||"";
assert.ok(!hiddenMenu.includes("La empresa"),"Unpublished built-in still in menu");
await toggle("nosotros",true);
assert.equal((await fetch(origin+"/nosotros")).status,200);
await toggle(slug,false);
assert.equal((await fetch(origin+"/pagina/"+slug)).status,404);
const foreign=execFileSync("curl",["-sS","-o","/dev/null","-w","%{http_code}","-H","Host: unknown-company.invalid",origin+"/pagina/"+slug],{encoding:"utf8"}).trim();
assert.equal(foreign,"404","Cross-tenant custom page leak");

const hero=await sharp({create:{width:2400,height:1320,channels:3,background:"#bbbdc1"}}).png().toBuffer();
const transparent=await sharp({create:{width:1200,height:800,channels:4,background:{r:180,g:33,b:45,alpha:0.4}}}).png().toBuffer();
for(const [kind,data,minWidth] of [["hero",hero,2200],["logo",transparent,900]]){
 const up=new FormData();up.set("image",new Blob([data],{type:"image/png"}),"media.png");
 const response=await fetch(origin+"/api/admin/site-media/"+kind,{method:"POST",headers:auth,body:up});
 assert.equal(response.status,200,"High quality upload failed: "+(await response.text()));
 const asset=await fetch(origin+"/api/site-media/"+kind);
 assert.equal(asset.status,200);assert.equal(asset.headers.get("content-type"),"image/webp");
 const info=await sharp(Buffer.from(await asset.arrayBuffer())).metadata();
 assert.equal(info.format,"webp");assert.ok((info.width||0)>=minWidth,"Image output unexpectedly downscaled.");
 if(kind==="logo")assert.equal(info.hasAlpha,true,"Logo transparency must be preserved.");
 const remove=await fetch(origin+"/api/admin/site-media/"+kind,{method:"DELETE",headers:auth});
 assert.equal(remove.status,200);
}
console.log("CMS: draft/publish, custom pages, menu ordering, CSRF, tenant isolation, high-fidelity WebP passed.");
