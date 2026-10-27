import {NextRequest} from "next/server";
import {prisma} from "@/lib/prisma";
import {requireAdmin} from "@/lib/auth";
import {propertyRedirect,validMutationOrigin} from "@/lib/admin-property-request";
import {CUSTOM_PAGE_PREFIX,validCustomSlug} from "@/lib/site-pages";
import {parseSectionsForm} from "@/lib/page-sections";
import {type Prisma} from "@prisma/client";
export const runtime="nodejs";
function fail(code:string){return propertyRedirect("/admin/personalizar/paginas/nueva?error="+code);}
export async function POST(req:NextRequest){
 const admin=await requireAdmin();
 if(!admin.roles.some(r=>["admin","editor"].includes(r)))return fail("permisos");
 if(!validMutationOrigin(req))return fail("origen");
 const len=Number(req.headers.get("content-length")||0);
 if(!Number.isSafeInteger(len)||len<1||len>48000)return fail("datos");
 let form:FormData;
 try{form=await req.formData();}catch{return fail("datos");}
 const title=form.get("title"),slug=form.get("slug"),summary=form.get("summary"),body=form.get("body");
 if(typeof title!=="string"||title.trim().length<3||title.length>90||typeof slug!=="string"||!validCustomSlug(slug)
  ||typeof summary!=="string"||summary.length>240||typeof body!=="string"||body.length>10000)return fail("datos");
 let sections;
 try{sections=parseSectionsForm(form.get("sections"))||[];}
 catch{return fail("datos");}
 if(sections.some(section=>section.type==="image"))return fail("imagenes");
 const published=form.get("published")==="on";
 try{
  await prisma.sitePage.create({data:{
   tenantId:admin.tenantId,slug:CUSTOM_PAGE_PREFIX+slug,title:title.trim(),
   blocks:{summary:summary.trim(),body:body.trim(),sections} as Prisma.InputJsonValue,published
  }});
  return propertyRedirect("/admin/personalizar/paginas/"+encodeURIComponent(slug)+"?created=1");
 }catch(e){
  if(e&&typeof e==="object"&&"code" in e&&e.code==="P2002")return fail("duplicada");
  console.error("[site-pages] create",e instanceof Error?e.name:"unknown");return fail("servidor");
 }
}
