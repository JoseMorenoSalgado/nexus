import {tenantModuleEnabled} from "@/lib/tenant-modules";
import {NextRequest} from "next/server";
import {prisma} from "@/lib/prisma";
import {validateAssignedAgent} from "@/lib/property-agent";
import {parseProperty,PropertyFormError} from "@/lib/property-form";
import {createPropertyWithReference,createStandalonePropertyWithReference} from "@/lib/property-reference";
import {propertyRedirect,validMutationOrigin,propertyEditor,propertyErrorPath,MAX_PROPERTY_FORM_BYTES,logPropertyError} from "@/lib/admin-property-request";
export const runtime="nodejs";
export async function POST(req:NextRequest){
 const admin=await propertyEditor();
 if(process.env.NEXUS_STANDALONE!=="true"&&!await tenantModuleEnabled(admin.tenantId,"properties"))return new Response("Módulo desactivado",{status:403});
 if(!admin.canEdit)return propertyRedirect("/admin/propiedades?error=permisos");
 if(!validMutationOrigin(req))return propertyRedirect(propertyErrorPath("origen"));
 if(Number(req.headers.get("content-length")||0)>MAX_PROPERTY_FORM_BYTES)return propertyRedirect(propertyErrorPath("datos"));
 try{
  const form=await req.formData();
  const data=parseProperty(form);
  const assignedAgentId=admin.canManageAll?await validateAssignedAgent(admin.tenantId,form.get("assignedAgentId")):admin.userId;
  const property=process.env.NEXUS_STANDALONE==="true"
   ?await createStandalonePropertyWithReference({...data,assignedAgentId})
   :await createPropertyWithReference(admin.tenantId,{...data,assignedAgentId});
  return propertyRedirect("/admin/propiedades/"+encodeURIComponent(property.id)+"/editar?created=1");
 }catch(error){
  if(error instanceof Error&&error.message==="AGENT_INVALID")return propertyRedirect(propertyErrorPath("datos"));
  if(error instanceof PropertyFormError)return propertyRedirect(propertyErrorPath(error.code));
  if(error&&typeof error==="object"&&"code" in error&&error.code==="P2002")return propertyRedirect(propertyErrorPath("duplicado"));
  logPropertyError("create",error);
  return propertyRedirect(propertyErrorPath("servidor"));
 }
}
