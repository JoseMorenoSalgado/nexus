import {randomBytes} from "node:crypto";
import {dirname} from "node:path";
import {mkdir,readdir,writeFile} from "node:fs/promises";
import {NextRequest,NextResponse} from "next/server";
import sharp from "sharp";
import {requireAdmin} from "@/lib/auth";
import {validMutationOrigin} from "@/lib/admin-property-request";
import {getCustomPage} from "@/lib/site-pages";
import {isBuiltinPageSlug,builtinPageAvailable} from "@/lib/page-extras";
import {validCustomSlug} from "@/lib/page-slug";
import {PAGE_IMAGE_MAX_BYTES,pageImagePath} from "@/lib/page-images";

export const runtime="nodejs";
const error=(message:string,status:number)=>NextResponse.json({error:message},{status,headers:{"Cache-Control":"no-store"}});
export async function POST(req:NextRequest,{params}:{params:Promise<{slug:string}>}){
 const admin=await requireAdmin();
 if(!admin.roles.some(role=>role==="admin"||role==="editor"))return error("Sin permisos de edición.",403);
 if(!validMutationOrigin(req))return error("Origen no autorizado.",403);
 const {slug}=await params;
 if(!validCustomSlug(slug))return error("Página inválida.",404);
 const exists=isBuiltinPageSlug(slug)?await builtinPageAvailable(admin.tenantId,slug):Boolean(await getCustomPage(admin.tenantId,slug));
 if(!exists)return error("Guarda la página antes de agregar imágenes.",404);
 const size=Number(req.headers.get("content-length")||0);
 if(!Number.isSafeInteger(size)||size<1||size>PAGE_IMAGE_MAX_BYTES+1024*1024)return error("Máximo 8 MB por imagen.",413);
 let file:FormDataEntryValue|null;
 try{file=(await req.formData()).get("image");}catch{return error("No se pudo leer la imagen.",400);}
 if(!(file instanceof File))return error("Selecciona una imagen.",400);
 if(file.size<100||file.size>PAGE_IMAGE_MAX_BYTES)return error("Máximo 8 MB por imagen.",413);
 if(!["image/png","image/jpeg","image/webp"].includes(file.type))return error("Usa JPG, PNG o WebP.",415);
 let output:Buffer;
 try{
  const data=Buffer.from(await file.arrayBuffer());
  const pipeline=sharp(data,{limitInputPixels:40_000_000,failOn:"error"});
  const meta=await pipeline.metadata();
  if(!["png","jpeg","webp"].includes(meta.format||""))return error("Imagen no válida.",415);
  output=await pipeline.rotate().resize({width:1920,height:1440,fit:"inside",withoutEnlargement:true,kernel:"lanczos3"})
   .webp({quality:88,effort:5,smartSubsample:true}).toBuffer();
 }catch{return error("Imagen dañada o demasiado grande.",422);}
 try{
  const id=randomBytes(16).toString("hex");
  const target=pageImagePath(admin.tenantId,slug,id);
  await mkdir(dirname(target),{recursive:true,mode:0o700});
  const images=(await readdir(dirname(target))).filter(name=>/^[a-f0-9]{32}\.webp$/.test(name));
  if(images.length>=50)return error("Esta página alcanzó el límite de imágenes almacenadas. Contacta con soporte para depurarlas.",409);
  await writeFile(target,output,{flag:"wx",mode:0o600});
  return NextResponse.json({ok:true,id},{headers:{"Cache-Control":"no-store"}});
 }catch(e){
  console.error("[custom-page-images] upload",e instanceof Error?e.name:"unknown");
  return error("No se pudo guardar la imagen. Verifica el almacenamiento persistente.",500);
 }
}
