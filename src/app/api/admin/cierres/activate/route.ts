import {NextRequest} from "next/server";
import {requireAdmin} from "@/lib/auth";
import {tenantModuleEnabled} from "@/lib/tenant-modules";
import {activateClosings} from "@/lib/closing-schema";
import {propertyRedirect,validMutationOrigin} from "@/lib/admin-property-request";
export const runtime="nodejs";
export async function POST(req:NextRequest){
 const admin=await requireAdmin();
 if(!await tenantModuleEnabled(admin.tenantId,"closings"))return new Response("Módulo desactivado",{status:403});
 if(!admin.roles.includes("admin"))return propertyRedirect("/admin/cierres?error=permisos");
 if(!validMutationOrigin(req))return propertyRedirect("/admin/cierres?error=origen");
 const len=Number(req.headers.get("content-length")||0);
 if(!Number.isSafeInteger(len)||len>2000)return propertyRedirect("/admin/cierres?error=datos");
 let form:FormData;
 try{form=await req.formData();}catch{return propertyRedirect("/admin/cierres?error=datos");}
 if(form.get("backupConfirmed")!=="yes")return propertyRedirect("/admin/cierres?error=respaldo");
 try{
  await activateClosings();
  return propertyRedirect("/admin/cierres?activated=1");
 }catch(error){
  console.error("[closings] activation error",error instanceof Error?error.name:"unknown");
  return propertyRedirect("/admin/cierres?error=servidor");
 }
}
