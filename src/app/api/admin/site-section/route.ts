import {NextRequest} from "next/server";
import {requireAdmin} from "@/lib/auth";
import {propertyRedirect,validMutationOrigin} from "@/lib/admin-property-request";
import {isSiteEditSection,savePartialSiteSection,savePartialBrand} from "@/lib/site-section-editor";
import {SiteSettingsError} from "@/lib/site-settings";
export const runtime="nodejs";
export async function POST(req:NextRequest){
 const admin=await requireAdmin();
 const root="/admin/personalizar/paginas/";
 if(!admin.roles.some(r=>["admin","editor"].includes(r)))return propertyRedirect(root+"?error=permisos");
 if(!validMutationOrigin(req))return propertyRedirect(root+"?error=origen");
 const length=Number(req.headers.get("content-length")||0);
 if(!Number.isSafeInteger(length)||length<1||length>16000)return propertyRedirect(root+"?error=datos");
 let form:FormData;
 try{form=await req.formData();}catch{return propertyRedirect(root+"?error=datos");}
 const raw=form.get("section");
 if(typeof raw!=="string"||!isSiteEditSection(raw))return propertyRedirect(root+"?error=datos");
 const destination=raw==="identidad"?"/admin/personalizar/identidad":root+raw;
 try{
  if(raw==="identidad")await savePartialBrand(admin.tenantId,"identidad",form);
  else{
   await savePartialSiteSection(admin.tenantId,raw,form);
   if(raw==="contacto")await savePartialBrand(admin.tenantId,"contacto",form);
  }
  return propertyRedirect(destination+"?saved=1");
 }catch(e){
  if(e instanceof SiteSettingsError)return propertyRedirect(destination+"?error=datos");
  console.error("[site-section] save",e instanceof Error?e.name:"unknown");
  return propertyRedirect(destination+"?error=servidor");
 }
}
