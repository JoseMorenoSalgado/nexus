import {type NextRequest} from "next/server";
import {requireAdmin} from "@/lib/auth";
import {validMutationOrigin,propertyRedirect} from "@/lib/admin-property-request";
import {updateTenantModules} from "@/lib/tenant-modules";

export const runtime="nodejs";
const destination="/admin/modulos";
export async function POST(request:NextRequest){
 const admin=await requireAdmin();
 if(!admin.roles.includes("admin"))return propertyRedirect(destination+"?error=permisos");
 if(!validMutationOrigin(request))return propertyRedirect(destination+"?error=origen");
 const length=Number(request.headers.get("content-length")||0);
 if(!Number.isSafeInteger(length)||length>8000)return propertyRedirect(destination+"?error=datos");
 try{
  const form=await request.formData();
  if(form.getAll("modules").length>20)return propertyRedirect(destination+"?error=datos");
  await updateTenantModules(admin.tenantId,form.getAll("modules"));
  return propertyRedirect(destination+"?saved=1");
 }catch(error){
  console.error("[tenant-modules] update",error instanceof Error?error.name:"unknown");
  return propertyRedirect(destination+"?error=datos");
 }
}
