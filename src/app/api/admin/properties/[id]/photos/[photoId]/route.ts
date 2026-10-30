import {tenantModuleEnabled} from "@/lib/tenant-modules";
import {unlink} from "node:fs/promises";
import {NextRequest,NextResponse} from "next/server";
import {prisma} from "@/lib/prisma";
import {mediaFilePath,mediaVariantPath,isPhotoId} from "@/lib/property-media";
import {propertyEditor,validMutationOrigin} from "@/lib/admin-property-request";
import {propertyWhere} from "@/lib/agent-scope";
export const runtime="nodejs";
const res=(error:string,status:number)=>NextResponse.json({error},{status,headers:{"Cache-Control":"no-store"}});
export async function DELETE(req:NextRequest,{params}:{params:Promise<{id:string;photoId:string}>}){
 const admin=await propertyEditor();
 if(!await tenantModuleEnabled(admin.tenantId,"properties"))return new Response("Módulo desactivado",{status:403});
 if(!admin.canEdit)return res("No autorizado.",403);
 if(!validMutationOrigin(req))return res("Origen no autorizado.",403);
 const {id,photoId}=await params;
 if(!isPhotoId(photoId))return res("Fotografía no encontrada.",404);
 const photo=await prisma.photo.findFirst({where:{id:photoId,propertyId:id,property:propertyWhere(admin)},select:{id:true,url:true}});
 if(!photo)return res("Fotografía no encontrada.",404);
 await prisma.photo.delete({where:{id:photoId}});
 if(photo.url==="/api/media/"+photoId){
  await Promise.allSettled([unlink(mediaFilePath(admin.tenantId,photoId)),unlink(mediaVariantPath(admin.tenantId,photoId,"card")),unlink(mediaVariantPath(admin.tenantId,photoId,"thumb"))]);
 }
 return NextResponse.json({ok:true},{headers:{"Cache-Control":"no-store"}});
}
