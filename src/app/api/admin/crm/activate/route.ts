import {NextRequest} from "next/server";
import {requireAdmin} from "@/lib/auth";
import {tenantModuleEnabled} from "@/lib/tenant-modules";
import {activateCrm} from "@/lib/crm-schema";
import {propertyRedirect,validMutationOrigin} from "@/lib/admin-property-request";
export const runtime="nodejs";
export async function POST(req:NextRequest){
 const admin=await requireAdmin();
 if(!await tenantModuleEnabled(admin.tenantId,"inquiries"))return new Response("Módulo desactivado",{status:403});
 if(!admin.roles.includes("admin"))return propertyRedirect("/admin/leads?error=permisos");
 if(!validMutationOrigin(req))return propertyRedirect("/admin/leads?error=origen");
 try{
  await activateCrm();
  return propertyRedirect("/admin/leads?activated=1");
 }catch(error){
  console.error("[crm] activation failed",error instanceof Error?error.name:"unknown");
  return propertyRedirect("/admin/leads?error=activacion");
 }
}
