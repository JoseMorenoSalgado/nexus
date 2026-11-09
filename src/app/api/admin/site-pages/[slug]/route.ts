import {NextRequest} from "next/server";
import {getStandalonePrisma} from "@/lib/prisma-standalone";
import {isStandaloneMode} from "@/lib/installation-mode";
import {prisma} from "@/lib/prisma";
import {requireAdmin} from "@/lib/auth";
import {propertyRedirect,validMutationOrigin} from "@/lib/admin-property-request";
import {CUSTOM_PAGE_PREFIX,validCustomSlug} from "@/lib/site-pages";
import {parseSectionsForm,normalizePageSections} from "@/lib/page-sections";
import {hasPageImage} from "@/lib/page-images";
import {type Prisma} from "@prisma/client";
export const runtime="nodejs";
const builtins=["propiedades","nosotros","servicios","contacto","asesoria-empresarial"];
export async function POST(req:NextRequest,{params}:{params:Promise<{slug:string}>}){
 const admin=await requireAdmin();
 const {slug}=await params;
 if(!admin.roles.some(r=>["admin","editor"].includes(r)))return propertyRedirect("/admin/personalizar/paginas?error=permisos");
 if(!validMutationOrigin(req,"/admin/personalizar"))return propertyRedirect("/admin/personalizar/paginas?error=origen");
 const size=Number(req.headers.get("content-length")||0);
 if(!Number.isSafeInteger(size)||size<1||size>48000)return propertyRedirect("/admin/personalizar/paginas?error=datos");
 if(!builtins.includes(slug)&&!validCustomSlug(slug))return propertyRedirect("/admin/personalizar/paginas?error=datos");
 let form:FormData;
 try{form=await req.formData();}catch{return propertyRedirect("/admin/personalizar/paginas?error=datos");}
 const published=form.get("published")==="on";
 const builtin=builtins.includes(slug);
 const dbSlug=builtin?slug:CUSTOM_PAGE_PREFIX+slug;
 const destination=builtin?"/admin/personalizar/paginas":"/admin/personalizar/paginas/"+encodeURIComponent(slug);
 const db=isStandaloneMode()?getStandalonePrisma():null;
 const legacyWhere={tenantId_slug:{tenantId:admin.tenantId,slug:dbSlug}};
 const where={slug:dbSlug};
 try{
  if(builtin){
   const titles:Record<string,string>={propiedades:"Propiedades",nosotros:"Nosotros",servicios:"Servicios",contacto:"Contacto","asesoria-empresarial":"Asesoría Empresarial"};
   const create={slug:dbSlug,title:titles[slug],blocks:{} as Prisma.InputJsonValue,published};
   if(db)await db.sitePage.upsert({where,create,update:{published}});
   else await prisma.sitePage.upsert({where:legacyWhere,create:{...create,tenantId:admin.tenantId},update:{published}});
  }else{
   const select={blocks:true} as const;
   const existing=db?await db.sitePage.findUnique({where,select}):await prisma.sitePage.findUnique({where:legacyWhere,select});
   if(!existing)return propertyRedirect("/admin/personalizar/paginas?error=noexiste");
   if(form.get("intent")==="status"){
    if(db)await db.sitePage.update({where,data:{published}});
    else await prisma.sitePage.update({where:legacyWhere,data:{published}});
    return propertyRedirect("/admin/personalizar/paginas?saved=1");
   }
   const title=form.get("title"),summary=form.get("summary"),body=form.get("body");
   if(typeof title!=="string"||title.trim().length<3||title.length>90||
    typeof summary!=="string"||summary.length>240||typeof body!=="string"||body.length>10000)
    return propertyRedirect(destination+"?error=datos");
   let sections;
   try{
    const input=parseSectionsForm(form.get("sections"));
    const stored=existing.blocks&&typeof existing.blocks==="object"&&!Array.isArray(existing.blocks)
     ?existing.blocks as Record<string,unknown>:{};
    // Older clients that edit plain text must not silently delete saved sections.
    sections=input===null?normalizePageSections(stored.sections):input;
   }catch{return propertyRedirect(destination+"?error=secciones");}
   for(const section of sections){
    if(section.type==="image"&&!(await hasPageImage(admin.tenantId,slug,section.imageId)))
     return propertyRedirect(destination+"?error=imagenes");
   }
   const data={title:title.trim(),published,blocks:{summary:summary.trim(),body:body.trim(),sections} as Prisma.InputJsonValue};
   if(db)await db.sitePage.update({where,data});
   else await prisma.sitePage.update({where:legacyWhere,data});
  }
  return propertyRedirect(destination+"?saved=1");
 }catch(e){
  console.error("[site-pages] update",e instanceof Error?e.name:"unknown");
  return propertyRedirect(destination+"?error=servidor");
 }
}
