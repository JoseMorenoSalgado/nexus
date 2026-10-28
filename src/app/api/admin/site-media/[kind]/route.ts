import {randomUUID} from "node:crypto";
import {dirname} from "node:path";
import {mkdir,rename,unlink,writeFile} from "node:fs/promises";
import {NextRequest,NextResponse} from "next/server";
import sharp from "sharp";
import {requireAdmin} from "@/lib/auth";
import {validMutationOrigin} from "@/lib/admin-property-request";
import {isSiteAssetKind,SITE_ASSET_MAX_BYTES,siteAssetPath} from "@/lib/site-assets";

export const runtime="nodejs";
function error(message:string,status:number){return NextResponse.json({error:message},{status,headers:{"Cache-Control":"no-store"}});}
export async function POST(req:NextRequest,{params}:{params:Promise<{kind:string}>}){
 const admin=await requireAdmin();
 if(!admin.roles.some(r=>["admin","editor"].includes(r)))return error("No autorizado.",403);
 if(!validMutationOrigin(req))return error("Origen no autorizado.",403);
 const {kind}=await params;
 if(!isSiteAssetKind(kind))return error("Tipo de imagen inválido.",404);
 const length=Number(req.headers.get("content-length")||0);
 if(!Number.isSafeInteger(length)||length<1||length>SITE_ASSET_MAX_BYTES+1024*1024)return error("Imagen demasiado grande (máximo 8 MB).",413);
 let image:FormDataEntryValue|null;
 try{image=(await req.formData()).get("image");}catch{return error("No se pudo leer la imagen.",400);}
 if(!(image instanceof File))return error("Selecciona una imagen.",400);
 if(image.size<100||image.size>SITE_ASSET_MAX_BYTES)return error("La imagen debe pesar menos de 8 MB.",413);
 if(!["image/jpeg","image/png","image/webp"].includes(image.type))return error("Solo se admiten JPG, PNG y WebP.",415);
 let output:Buffer;
 try{
  const data=Buffer.from(await image.arrayBuffer());
  const pipeline=sharp(data,{limitInputPixels:40_000_000,failOn:"error"});
  const metadata=await pipeline.metadata();
  if(!["jpeg","png","webp"].includes(metadata.format||""))return error("Contenido de imagen no válido.",415);
  // Keep a detailed master: hero up to 2560px; logos stay sharp with lossless WebP.
  // Sharp strips EXIF/metadata after auto-rotation to avoid personal data exposure.
  const pixels=pipeline.rotate().resize({
   width:kind==="logo"?960:2560,height:kind==="logo"?960:1600,
   fit:"inside",withoutEnlargement:true,kernel:"lanczos3"
  });
  output=await pixels.webp(kind==="logo"
   ?{lossless:true,effort:6}
   :{quality:94,effort:6,smartSubsample:true}).toBuffer();
 }catch{return error("Imagen dañada o dimensiones demasiado grandes.",422);}
 const target=siteAssetPath(admin.tenantId,kind),temp=target+"."+randomUUID()+".tmp";
 try{
  await mkdir(dirname(target),{recursive:true,mode:0o700});
  await writeFile(temp,output,{flag:"wx",mode:0o600});
  await rename(temp,target);
  return NextResponse.json({ok:true},{headers:{"Cache-Control":"no-store"}});
 }catch(e){
  console.error("[site-media] upload",e instanceof Error?e.name:"unknown");
  return error("No fue posible guardar la imagen. Revisa el volumen persistente.",500);
 }finally{try{await unlink(temp);}catch{}}
}
export async function DELETE(req:NextRequest,{params}:{params:Promise<{kind:string}>}){
 const admin=await requireAdmin();
 if(!admin.roles.some(r=>["admin","editor"].includes(r)))return error("No autorizado.",403);
 if(!validMutationOrigin(req))return error("Origen no autorizado.",403);
 const {kind}=await params;
 if(!isSiteAssetKind(kind))return error("Imagen no encontrada.",404);
 try{
  await unlink(siteAssetPath(admin.tenantId,kind));
  return NextResponse.json({ok:true},{headers:{"Cache-Control":"no-store"}});
 }catch(e){
  if(e&&typeof e==="object"&&"code" in e&&e.code==="ENOENT")return error("No hay imagen que eliminar.",404);
  return error("No se pudo eliminar la imagen.",500);
 }
}
