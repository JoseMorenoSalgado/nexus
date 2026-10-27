import {randomBytes} from "node:crypto";
import {constants} from "node:fs";
import {copyFile,mkdir,readdir} from "node:fs/promises";
import {dirname} from "node:path";
import {NextRequest,NextResponse} from "next/server";
import {requireAdmin} from "@/lib/auth";
import {validMutationOrigin} from "@/lib/admin-property-request";
import {getPageDefinitions} from "@/lib/site-pages";
import {pageImageId} from "@/lib/page-sections";
import {pageImagePath,hasPageImage} from "@/lib/page-images";
export const runtime="nodejs";
const fail=(error:string,status:number)=>NextResponse.json({error},{status,headers:{"Cache-Control":"no-store"}});
export async function POST(req:NextRequest){
 const admin=await requireAdmin();
 if(!admin.roles.some(x=>x==="admin"||x==="editor"))return fail("Sin permisos.",403);
 if(!validMutationOrigin(req))return fail("Origen no autorizado.",403);
 const size=Number(req.headers.get("content-length")||0);
 if(!Number.isSafeInteger(size)||size<2||size>1600)return fail("Solicitud inválida.",413);
 let payload:unknown;
 try{payload=await req.json();}catch{return fail("Solicitud inválida.",400);}
 if(!payload||typeof payload!=="object"||Array.isArray(payload))return fail("Datos inválidos.",400);
 const v=payload as Record<string,unknown>;
 const from=typeof v.sourceSlug==="string"?v.sourceSlug:"";
 const to=typeof v.targetSlug==="string"?v.targetSlug:"";
 const id=typeof v.imageId==="string"?v.imageId:"";
 if(!pageImageId.test(id))return fail("Imagen inválida.",400);
 // Filtering against definitions avoids access to internal SitePage settings.
 const pages=await getPageDefinitions(admin.tenantId);
 if(!pages.some(p=>p.slug===from)||!pages.some(p=>p.slug===to))return fail("Página no disponible.",404);
 if(!await hasPageImage(admin.tenantId,from,id))return fail("Imagen no encontrada.",404);
 if(from===to)return NextResponse.json({ok:true,id},{headers:{"Cache-Control":"no-store"}});
 const src=pageImagePath(admin.tenantId,from,id);
 for(let tries=0;tries<3;tries++){
  const newId=randomBytes(16).toString("hex");
  const dest=pageImagePath(admin.tenantId,to,newId);
  try{
   await mkdir(dirname(dest),{recursive:true,mode:0o700});
   const filenames=(await readdir(dirname(dest))).filter(f=>/^[a-f0-9]{32}\.webp$/.test(f));
   if(filenames.length>=50)return fail("La página ya contiene 50 imágenes. Contacta con soporte.",409);
   await copyFile(src,dest,constants.COPYFILE_EXCL);
   return NextResponse.json({ok:true,id:newId},{headers:{"Cache-Control":"no-store"}});
  }catch(e){if(e&&typeof e==="object"&&"code" in e&&e.code==="EEXIST")continue;
   return fail("No fue posible utilizar la imagen seleccionada.",500);
  }
 }
 return fail("No se pudo reservar un identificador de imagen.",500);
}
