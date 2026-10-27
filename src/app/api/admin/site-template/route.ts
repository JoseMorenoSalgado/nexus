import {type NextRequest} from "next/server";
import {requireAdmin} from "@/lib/auth";
import {validMutationOrigin,propertyRedirect} from "@/lib/admin-property-request";
import {isTemplateKey} from "@/lib/site-template-registry";
import {updateSiteTemplate} from "@/lib/site-template-store";

export const runtime="nodejs";
const dest="/admin/personalizar/plantilla";
export async function POST(req:NextRequest){
 const admin=await requireAdmin();
 if(!admin.roles.some(role=>role==="admin"||role==="editor"))return propertyRedirect(dest+"?error=permisos");
 if(!validMutationOrigin(req))return propertyRedirect(dest+"?error=origen");
 const length=Number(req.headers.get("content-length")||0);
 if(!Number.isSafeInteger(length)||length<1||length>14000)return propertyRedirect(dest+"?error=datos");
 try{
  const form=await req.formData();
  const key=form.get("templateKey"),intent=form.get("intent");
  if(!isTemplateKey(key)||(intent!=="select"&&intent!=="content"))return propertyRedirect(dest+"?error=datos");
  await updateSiteTemplate(admin.tenantId,intent,key,form);
  return propertyRedirect(dest+"?saved=1");
 }catch(error){
  if(error instanceof Error&&["TEMPLATE_INVALID","TEMPLATE_CHANGED"].includes(error.message))return propertyRedirect(dest+"?error=datos");
  console.error("[site-template] update",error instanceof Error?error.name:"unknown");
  return propertyRedirect(dest+"?error=servidor");
 }
}
