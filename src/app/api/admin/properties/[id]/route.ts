import {tenantModuleEnabled} from "@/lib/tenant-modules";
import {NextRequest} from "next/server";
import {prisma} from "@/lib/prisma";
import {getStandalonePrisma} from "@/lib/prisma-standalone";
import {validateAssignedAgent} from "@/lib/property-agent";
import {parseProperty,PropertyFormError} from "@/lib/property-form";
import {propertyWhere} from "@/lib/agent-scope";
import {propertyRedirect,validMutationOrigin,propertyEditor,propertyErrorPath,MAX_PROPERTY_FORM_BYTES,logPropertyError} from "@/lib/admin-property-request";
import {unlink} from "node:fs/promises";
import {isStoredPropertyPhoto,mediaFilePath,mediaVariantPath} from "@/lib/property-media";
import {customPdfPath} from "@/lib/property-document";
export const runtime="nodejs";
export async function POST(req:NextRequest,{params}:{params:Promise<{id:string}>}){
 const {id}=await params;
 const admin=await propertyEditor();
 if(process.env.NEXUS_STANDALONE!=="true"&&!await tenantModuleEnabled(admin.tenantId,"properties"))return new Response("Módulo desactivado",{status:403});
 if(!admin.canEdit)return propertyRedirect("/admin/propiedades?error=permisos");
 if(!validMutationOrigin(req))return propertyRedirect(propertyErrorPath("origen",id));
 if(Number(req.headers.get("content-length")||0)>MAX_PROPERTY_FORM_BYTES)return propertyRedirect(propertyErrorPath("datos",id));
 const standalone=process.env.NEXUS_STANDALONE==="true";
 const standaloneDb=standalone?getStandalonePrisma():null;
 const standaloneScope={id,...(!admin.canManageAll?{assignedAgentId:admin.userId}:{})};
 const legacyScope={id,...propertyWhere(admin)};
 try{
  const select={id:true,refCode:true,assignedAgentId:true,photos:{select:{id:true,url:true}}} as const;
  const property=standaloneDb
   ?await standaloneDb.property.findFirst({where:standaloneScope,select})
   :await prisma.property.findFirst({where:legacyScope,select});
  if(!property)return propertyRedirect("/admin/propiedades?error=noexiste");
  const form=await req.formData();
  const intent=String(form.get("intent")||"save");
  if(intent==="publish"||intent==="unpublish"){
   const changed=standaloneDb
    ?await standaloneDb.property.updateMany({where:standaloneScope,data:{published:intent==="publish"}})
    :await prisma.property.updateMany({where:legacyScope,data:{published:intent==="publish"}});
   if(!changed.count)return propertyRedirect("/admin/propiedades?error=permisos");
   return propertyRedirect("/admin/propiedades?updated=1");
  }
  if(intent==="delete"){
   if(!admin.canDelete||form.get("confirmation")!==property.refCode)return propertyRedirect(propertyErrorPath("confirmacion",id));
   const confirmed={refCode:property.refCode};
   const deleted=standaloneDb
    ?await standaloneDb.property.deleteMany({where:{...standaloneScope,...confirmed,closings:{none:{}}}})
    :await prisma.property.deleteMany({where:{...legacyScope,...confirmed,closings:{none:{}}}});
   if(!deleted.count){
    const linked=standaloneDb
     ?await standaloneDb.property.count({where:{...standaloneScope,...confirmed,closings:{some:{}}}})
     :await prisma.property.count({where:{...legacyScope,...confirmed,closings:{some:{}}}});
    return linked?propertyRedirect(propertyErrorPath("vinculada",id)):propertyRedirect("/admin/propiedades?error=noexiste");
   }
   await Promise.all([
    ...property.photos.filter(isStoredPropertyPhoto).map(async p=>{
     await Promise.allSettled([
      unlink(mediaFilePath(admin.tenantId,p.id)),
      unlink(mediaVariantPath(admin.tenantId,p.id,"card")),
      unlink(mediaVariantPath(admin.tenantId,p.id,"thumb"))
     ]);
    }),
    (async()=>{try{await unlink(customPdfPath(admin.tenantId,property.id));}catch{/* Already removed or queued for cleanup */}})()
   ]);
   return propertyRedirect("/admin/propiedades?deleted=1");
  }
  if(intent!=="save")return propertyRedirect(propertyErrorPath("datos",id));
  const data=parseProperty(form);
  const assignedAgentId=admin.canManageAll?await validateAssignedAgent(admin.tenantId,form.get("assignedAgentId")):property.assignedAgentId;
  const changed=standaloneDb
   ?await standaloneDb.property.updateMany({where:standaloneScope,data:{...data,assignedAgentId}})
   :await prisma.property.updateMany({where:legacyScope,data:{...data,assignedAgentId}});
  if(!changed.count)return propertyRedirect("/admin/propiedades?error=permisos");
  return propertyRedirect("/admin/propiedades/"+encodeURIComponent(id)+"/editar?saved=1");
 }catch(error){
  if(error instanceof Error&&error.message==="AGENT_INVALID")return propertyRedirect(propertyErrorPath("datos",id));
  if(error instanceof PropertyFormError)return propertyRedirect(propertyErrorPath(error.code,id));
  if(error&&typeof error==="object"&&"code" in error&&error.code==="P2003")return propertyRedirect(propertyErrorPath("vinculada",id));
  if(error&&typeof error==="object"&&"code" in error&&error.code==="P2002")return propertyRedirect(propertyErrorPath("duplicado",id));
  logPropertyError("change",error);
  return propertyRedirect(propertyErrorPath("servidor",id));
 }
}
