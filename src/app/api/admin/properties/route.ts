import {tenantModuleEnabled} from "@/lib/tenant-modules";
import {NextRequest} from "next/server";
import {prisma} from "@/lib/prisma";
import {validateAssignedAgent} from "@/lib/property-agent";
import {parseProperty,PropertyFormError} from "@/lib/property-form";
import {createPropertyWithReference} from "@/lib/property-reference";
import {propertyRedirect,validMutationOrigin,propertyEditor,propertyErrorPath} from "@/lib/admin-property-request";
export const runtime="nodejs";
export async function POST(req:NextRequest){
 const admin=await propertyEditor();
 if(!await tenantModuleEnabled(admin.tenantId,"properties"))return new Response("Módulo desactivado",{status:403});
 if(!admin.canEdit)return propertyRedirect("/admin/propiedades?error=permisos");
 if(!validMutationOrigin(req))return propertyRedirect(propertyErrorPath("origen"));
 if(Number(req.headers.get("content-length")||0)>28000)return propertyRedirect(propertyErrorPath("datos"));
 try{
  const form=await req.formData();
  const data=parseProperty(form);
  const assignedAgentId=admin.canManageAll?await validateAssignedAgent(admin.tenantId,form.get("assignedAgentId")):admin.userId;
  const property=await createPropertyWithReference(admin.tenantId,{...data,assignedAgentId});
  return propertyRedirect("/admin/propiedades/"+encodeURIComponent(property.id)+"/editar?created=1");
 }catch(error){
  if(error instanceof Error&&error.message==="AGENT_INVALID")return propertyRedirect(propertyErrorPath("datos"));
  if(error instanceof PropertyFormError)return propertyRedirect(propertyErrorPath(error.code));
  if(error&&typeof error==="object"&&"code" in error&&error.code==="P2002")return propertyRedirect(propertyErrorPath("duplicado"));
  console.error("[properties] create failed",error instanceof Error?error.name:"unknown");
  return propertyRedirect(propertyErrorPath("servidor"));
 }
}
