import assert from "node:assert/strict";
import sharp from "sharp";
import {readFileSync} from "node:fs";

const origin=process.env.TEST_ORIGIN||"http://localhost:3000";
assert.equal(new URL(origin).hostname,"localhost","Image editing tests only run against local CI.");
const imageSlot=readFileSync("src/lib/site-assets.ts","utf8");
assert.match(imageSlot,/hero-asesoria-empresarial/);
assert.match(readFileSync("src/components/page-image-editor.tsx","utf8"),/SiteAssetManager/);
const nav=readFileSync("src/components/admin-nav.tsx","utf8");
assert.match(nav,/tools\.unshift\(\{href:"\/admin\/personalizar\/inicio"/);
assert.match(readFileSync("src/app/admin/layout.tsx","utf8"),/index:false/);
assert.match(readFileSync("next.config.mjs","utf8"),/X-Robots-Tag/);

const login=new FormData();
login.set("email",process.env.ADMIN_EMAIL||"");
login.set("password",process.env.ADMIN_PASSWORD||"");
const logged=await fetch(origin+"/api/admin/session",{method:"POST",headers:{Origin:origin},body:login,redirect:"manual"});
assert.equal(logged.status,303);
const cookie=logged.headers.getSetCookie().find(x=>x.startsWith("webappecloud_session="))?.split(";")[0];
assert.ok(cookie);
const privateHeaders={Origin:origin,Cookie:cookie};
const data=await sharp({create:{width:600,height:400,channels:3,background:"#2b4255"}}).png().toBuffer();
const cases=[
 ["hero","home","/"],
 ["hero-propiedades","propiedades","/propiedades"],
 ["hero-nosotros","nosotros","/nosotros"],
 ["hero-servicios","servicios","/servicios"],
 ["hero-contacto","contacto","/contacto"],
 ["hero-asesoria-empresarial","asesoria-empresarial","/asesoria-empresarial"],
 ["about-photo","nosotros","/nosotros"]
];
for(const [kind,slug,route] of cases){
 const editor=await fetch(origin+"/admin/personalizar/paginas/"+slug,{headers:{Cookie:cookie}});
 assert.equal(editor.status,200,"Cannot open image editor for "+slug);
 const markup=await editor.text();
 assert.match(markup,/Imágenes de esta página/,"No image controls on "+slug);
 const payload=new FormData();
 payload.set("image",new Blob([data],{type:"image/png"}),kind+".png");
 const uploaded=await fetch(origin+"/api/admin/site-media/"+kind,{method:"POST",headers:privateHeaders,body:payload});
 assert.equal(uploaded.status,200,kind+" upload failed: "+await uploaded.text());
 const adminImage=await fetch(origin+"/api/admin/site-media/"+kind,{headers:{Cookie:cookie}});
 assert.equal(adminImage.status,200,kind+" admin preview failed");
 assert.equal(adminImage.headers.get("content-type"),"image/webp");
 const anonymous=await fetch(origin+"/api/admin/site-media/"+kind,{redirect:"manual"});
 assert.ok([303,307,308].includes(anonymous.status),"Private image exposed without login");
 const publicPage=await fetch(origin+route);
 if(publicPage.status===200){
  const html=await publicPage.text();
  assert.ok(html.includes("/api/site-media/"+kind),"Public page did not display changed image: "+kind);
 }else{
  assert.equal(publicPage.status,404,"Unpublished page must be hidden");
  assert.equal((await fetch(origin+"/api/site-media/"+kind)).status,404,"Draft image became public: "+kind);
 }
 const cleared=await fetch(origin+"/api/admin/site-media/"+kind,{method:"DELETE",headers:privateHeaders});
 assert.equal(cleared.status,200,"Could not restore default: "+kind);
}
console.log("NEXUS image editors: all six pages, about photo, admin permissions, draft secrecy, uploads and reset passed.");
