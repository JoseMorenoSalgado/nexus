import {tenantModuleEnabled} from "@/lib/tenant-modules";
import {NextRequest,NextResponse} from "next/server";
import {prisma} from "@/lib/prisma";
import {propertyEditor,validMutationOrigin} from "@/lib/admin-property-request";

export const runtime="nodejs";
const error=(message:string,status:number)=>NextResponse.json({error:message},{status,headers:{"Cache-Control":"no-store"}});
export async function PATCH(req:NextRequest,{params}:{params:Promise<{id:string}>}){
 const admin=await propertyEditor();
 if(!await tenantModuleEnabled(admin.tenantId,"properties"))return new Response("Módulo desactivado",{status:403});
 if(!admin.canEdit)return error("No autorizado.",403);
 if(!validMutationOrigin(req))return error("Origen no permitido.",403);
 const {id}=await params;
 let body:unknown;
 try{body=await req.json();}catch{return error("Datos inválidos.",400);}
 if(!body||typeof body!=="object"||!("photoIds" in body))return error("Orden inválido.",400);
 const ids=(body as {photoIds:unknown}).photoIds;
 if(!Array.isArray(ids)||ids.length>15||!ids.every(x=>typeof x==="string")||new Set(ids).size!==ids.length)return error("Orden inválido.",400);
 try{
  await prisma.$transaction(async tx=>{
   const property=await tx.property.findFirst({where:{id,tenantId:admin.tenantId},select:{id:true}});
   if(!property)throw new Error("NOT_FOUND");
   const existing=await tx.photo.findMany({where:{propertyId:id},select:{id:true}});
   if(existing.length!==ids.length||existing.some(p=>!ids.includes(p.id)))throw new Error("CONFLICT");
   for(let i=0;i<ids.length;i++)await tx.photo.update({where:{id:ids[i]},data:{sortOrder:i}});
  },{isolationLevel:"Serializable"});
  return NextResponse.json({ok:true},{headers:{"Cache-Control":"no-store"}});
 }catch(e){
  if(e instanceof Error&&e.message==="NOT_FOUND")return error("Propiedad no encontrada.",404);
  if(e instanceof Error&&e.message==="CONFLICT")return error("La galería cambió. Actualiza la página.",409);
  return error("No se pudo guardar el orden.",500);
 }
}
