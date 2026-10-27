import {NextRequest} from "next/server";
import {requireAdmin} from "@/lib/auth";
import {propertyRedirect,validMutationOrigin} from "@/lib/admin-property-request";
import {isBuiltinPageSlug,builtinPageAvailable,saveExtraSections} from "@/lib/page-extras";
import {parseSectionsForm} from "@/lib/page-sections";
import {hasPageImage} from "@/lib/page-images";

export const runtime="nodejs";
export async function POST(req:NextRequest,{params}:{params:Promise<{slug:string}>}){
 const admin=await requireAdmin();
 const {slug}=await params;
 const destination=isBuiltinPageSlug(slug)?"/admin/personalizar/paginas/"+slug:"/admin/personalizar/paginas";
 if(!admin.roles.some(role=>role==="admin"||role==="editor"))return propertyRedirect(destination+"?error=permisos");
 if(!validMutationOrigin(req))return propertyRedirect(destination+"?error=origen");
 if(!isBuiltinPageSlug(slug)||!await builtinPageAvailable(admin.tenantId,slug))return propertyRedirect("/admin/personalizar/paginas?error=datos");
 const bytes=Number(req.headers.get("content-length")||0);
 if(!Number.isSafeInteger(bytes)||bytes<1||bytes>25000)return propertyRedirect(destination+"?error=datos");
 let sections;
 try{
  const form=await req.formData();
  sections=parseSectionsForm(form.get("sections"));
  if(sections===null)throw Error("MISSING_SECTIONS");
 }catch{return propertyRedirect(destination+"?error=secciones");}
 for(const section of sections){
  if(section.type==="image"&&!await hasPageImage(admin.tenantId,slug,section.imageId))
   return propertyRedirect(destination+"?error=imagenes");
 }
 try{await saveExtraSections(admin.tenantId,slug,sections);}
 catch(e){console.error("[page-extras] save",e instanceof Error?e.name:"unknown");
  return propertyRedirect(destination+"?error=servidor");
 }
 return propertyRedirect(destination+"?blocksSaved=1");
}
