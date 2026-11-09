import {tenantModuleEnabled} from "@/lib/tenant-modules";
import {unlink} from "node:fs/promises";
import {NextRequest,NextResponse} from "next/server";
import {prisma} from "@/lib/prisma";
import {getStandalonePrisma} from "@/lib/prisma-standalone";
import {mediaFilePath,mediaVariantPath,isStoredPropertyPhoto} from "@/lib/property-media";
import {propertyEditor,validMutationOrigin} from "@/lib/admin-property-request";
import {propertyWhere} from "@/lib/agent-scope";
export const runtime="nodejs";
const res=(error:string,status:number)=>NextResponse.json({error},{status,headers:{"Cache-Control":"no-store"}});
export async function DELETE(req:NextRequest,{params}:{params:Promise<{id:string;photoId:string}>}){
 const admin=await propertyEditor();
 if(process.env.NEXUS_STANDALONE!=="true"&&!await tenantModuleEnabled(admin.tenantId,"properties"))return new Response("Módulo desactivado",{status:403});
 if(!admin.canEdit)return res("No autorizado.",403);
 if(!validMutationOrigin(req))return res("Origen no autorizado.",403);
 const {id,photoId}=await params;
 if(!/^[a-zA-Z0-9_-]{1,100}$/.test(photoId))return res("Fotografía no encontrada.",404);
 const standalone=process.env.NEXUS_STANDALONE==="true";
 const photo=standalone
  ?await getStandalonePrisma().photo.findFirst({where:{id:photoId,propertyId:id,property:!admin.canManageAll?{assignedAgentId:admin.userId}:undefined},select:{id:true,url:true}})
  :await prisma.photo.findFirst({where:{id:photoId,propertyId:id,property:propertyWhere(admin)},select:{id:true,url:true}});
 if(!photo)return res("Fotografía no encontrada.",404);
 if(standalone){
  const deleted=await getStandalonePrisma().photo.deleteMany({where:{id:photoId,propertyId:id,property:!admin.canManageAll?{assignedAgentId:admin.userId}:undefined}});
  if(!deleted.count)return res("Fotografía no encontrada.",404);
 }else await prisma.photo.delete({where:{id:photoId}});
 if(isStoredPropertyPhoto(photo)){
  await Promise.allSettled([unlink(mediaFilePath(admin.tenantId,photoId)),unlink(mediaVariantPath(admin.tenantId,photoId,"card")),unlink(mediaVariantPath(admin.tenantId,photoId,"thumb"))]);
 }
 return NextResponse.json({ok:true},{headers:{"Cache-Control":"no-store"}});
}

export {DELETE as POST};
