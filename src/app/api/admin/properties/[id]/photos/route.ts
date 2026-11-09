import {tenantModuleEnabled} from "@/lib/tenant-modules";
import {randomUUID} from "node:crypto";
import {mkdir,writeFile,unlink} from "node:fs/promises";
import {dirname} from "node:path";
import {NextRequest,NextResponse} from "next/server";
import sharp from "sharp";
import {prisma} from "@/lib/prisma";
import {getStandalonePrisma} from "@/lib/prisma-standalone";
import {MAX_IMAGE_BYTES,MAX_PHOTOS,mediaFilePath,mediaVariantPath} from "@/lib/property-media";
import {propertyEditor,validMutationOrigin} from "@/lib/admin-property-request";
import {readJsonObjectLimited,RequestPayloadError} from "@/lib/limited-json";
import {propertyWhere} from "@/lib/agent-scope";

export const runtime="nodejs";
function json(error:string,status:number){return NextResponse.json({error},{status,headers:{"Cache-Control":"no-store"}});}
const PHOTO_JSON_MAX_BYTES=4*Math.ceil(MAX_IMAGE_BYTES/3)+64;

async function readPhoto(req:NextRequest):Promise<Buffer>{
 const mediaType=req.headers.get("content-type")?.split(";",1)[0].trim().toLowerCase();
 if(mediaType==="application/json"){
  // Enhance rejects multipart file parts before the request reaches Next.js.
  const {image}=await readJsonObjectLimited(req,PHOTO_JSON_MAX_BYTES);
  if(typeof image!=="string"||image.length%4!==0||!/^[A-Za-z0-9+/]+={0,2}$/.test(image)){
   throw new RequestPayloadError(400,"No se pudo leer la fotografía enviada.");
  }
  return Buffer.from(image,"base64");
 }
 const length=Number(req.headers.get("content-length")||0);
 if(!Number.isSafeInteger(length)||length<1||length>MAX_IMAGE_BYTES+1000000){
  throw new RequestPayloadError(413,"Archivo demasiado grande (máximo 8 MB).");
 }
 let file:FormDataEntryValue|null;
 try{file=(await req.formData()).get("photo");}
 catch{throw new RequestPayloadError(400,"No se pudo leer la imagen.");}
 if(!(file instanceof File))throw new RequestPayloadError(400,"Selecciona una fotografía.");
 return Buffer.from(await file.arrayBuffer());
}
export async function POST(req:NextRequest,{params}:{params:Promise<{id:string}>}){
 const admin=await propertyEditor();
 if(process.env.NEXUS_STANDALONE!=="true"&&!await tenantModuleEnabled(admin.tenantId,"properties"))return new Response("Módulo desactivado",{status:403});
 if(!admin.canEdit)return json("No autorizado",403);
 if(!validMutationOrigin(req))return json("Origen no permitido",403);
 const {id}=await params;
 const standalone=process.env.NEXUS_STANDALONE==="true";
 const standaloneScope={id,...(!admin.canManageAll?{assignedAgentId:admin.userId}:{})};
 const property=standalone
  ?await getStandalonePrisma().property.findFirst({where:standaloneScope,select:{id:true,title:true}})
  :await prisma.property.findFirst({where:{id,...propertyWhere(admin)},select:{id:true,title:true}});
 if(!property)return json("Inmueble no encontrado.",404);
 let input:Buffer;
 try{input=await readPhoto(req);}
 catch(error){
  if(error instanceof RequestPayloadError)return json(error.message,error.status);
  return json("No se pudo leer la imagen.",400);
 }
 if(input.length<100||input.length>MAX_IMAGE_BYTES)return json("La fotografía debe tener entre 100 bytes y 8 MB.",413);
 // Every upload rechecks the quota in a serializable DB transaction.
 let output:Buffer;
 let card:Buffer;
 let thumb:Buffer;
 try{
  const converter=sharp(input,{limitInputPixels:40_000_000,failOn:"error"});
  const meta=await converter.metadata();
  if(!["jpeg","png","webp"].includes(meta.format||""))return json("Formato de imagen no reconocido.",415);
  const original=converter.rotate();
  [output,card,thumb]=await Promise.all([
   original.clone().resize({width:2560,height:2560,fit:"inside",withoutEnlargement:true}).webp({quality:90,effort:5,smartSubsample:true}).toBuffer(),
   original.clone().resize({width:900,height:900,fit:"inside",withoutEnlargement:true}).webp({quality:78,effort:4}).toBuffer(),
   original.clone().resize({width:240,height:240,fit:"inside",withoutEnlargement:true}).webp({quality:72,effort:4}).toBuffer()
  ]);
 }catch{return json("La imagen está dañada o supera las dimensiones permitidas.",422);}
 const photoId=randomUUID();
 const path=mediaFilePath(admin.tenantId,photoId);
 try{
  await mkdir(dirname(path),{recursive:true,mode:0o700});
  await Promise.all([
   writeFile(path,output,{flag:"wx",mode:0o600}),
   writeFile(mediaVariantPath(admin.tenantId,photoId,"card"),card,{flag:"wx",mode:0o600}),
   writeFile(mediaVariantPath(admin.tenantId,photoId,"thumb"),thumb,{flag:"wx",mode:0o600})
  ]);
  if(standalone){
   await getStandalonePrisma().$transaction(async tx=>{
    if((await tx.property.findFirst({where:standaloneScope,select:{id:true}}))===null)throw Error("MISSING");
    const photoCount=await tx.photo.count({where:{propertyId:id}});
    if(photoCount>=MAX_PHOTOS)throw Error("LIMIT");
    await tx.photo.create({data:{id:photoId,propertyId:id,url:"/api/media/"+photoId,alt:property.title,sortOrder:photoCount}});
   },{isolationLevel:"Serializable",timeout:15000,maxWait:10000});
  }else{
   await prisma.$transaction(async tx=>{
    if((await tx.property.findFirst({where:{id,...propertyWhere(admin)},select:{id:true}}))===null)throw Error("MISSING");
    const photoCount=await tx.photo.count({where:{propertyId:id}});
    if(photoCount>=MAX_PHOTOS)throw Error("LIMIT");
    await tx.photo.create({data:{id:photoId,propertyId:id,url:"/api/media/"+photoId,alt:property.title,sortOrder:photoCount}});
   },{isolationLevel:"Serializable",timeout:15000,maxWait:10000});
  }
  return NextResponse.json({ok:true,id:photoId,url:"/api/media/"+photoId},{status:201,headers:{"Cache-Control":"no-store"}});
 }catch(error){
  await Promise.allSettled([unlink(path),unlink(mediaVariantPath(admin.tenantId,photoId,"card")),unlink(mediaVariantPath(admin.tenantId,photoId,"thumb"))]);
  if(error instanceof Error&&error.message==="LIMIT")return json("Máximo de 15 fotografías por inmueble.",409);
  if(error instanceof Error&&error.message==="MISSING")return json("Inmueble no encontrado.",404);
  if(error&&typeof error==="object"&&"code" in error&&error.code==="P2034")return json("Otra fotografía se está procesando. Inténtalo nuevamente.",409);
  console.error("[property-media] upload",error instanceof Error?error.name:"unknown");
  return json("No se pudo guardar la fotografía.",500);
 }
}
