import {constants} from "node:fs";
import {copyFile,mkdir,stat,unlink,utimes} from "node:fs/promises";
import {dirname} from "node:path";
import {NextRequest,NextResponse} from "next/server";
import {requireAdmin} from "@/lib/auth";
import {validMutationOrigin} from "@/lib/admin-property-request";
import {getPageDefinitions} from "@/lib/site-pages";
import {pageImageId} from "@/lib/page-sections";
import {hasPageImage,pageImagePath} from "@/lib/page-images";
import {MEDIA_RECENT_MS,MEDIA_TRASH_RETENTION_MS,
 referencedTenantImages,trashedMediaPath} from "@/lib/media-library";

export const runtime="nodejs";
const fail=(error:string,status:number)=>NextResponse.json({error},{status,headers:{"Cache-Control":"no-store"}});
type Action="archive"|"restore"|"purge";

/** Explicit admin-only lifecycle:
 * archive: 24h grace + reject images referenced by ANY saved section (drafts included).
 * restore: copy back without replacing anything.
 * purge: at least 7 days in trash + second explicit confirmation.
 * In-flight, unsaved client edits cannot be discovered: recent media is not archivable.
 */
export async function POST(req:NextRequest){
 const admin=await requireAdmin();
 if(!admin.roles.includes("admin"))return fail("Solo un administrador puede gestionar la papelera.",403);
 if(!validMutationOrigin(req))return fail("Origen no autorizado.",403);
 const bytes=Number(req.headers.get("content-length")||0);
 if(!Number.isSafeInteger(bytes)||bytes<2||bytes>1500)return fail("Solicitud inválida.",413);
 let data:unknown;
 try{data=await req.json();}catch{return fail("Solicitud no válida.",400);}
 if(!data||typeof data!=="object"||Array.isArray(data))return fail("Solicitud no válida.",400);
 const payload=data as Record<string,unknown>;
 const slug=typeof payload.slug==="string"?payload.slug:"";
 const id=typeof payload.id==="string"?payload.id:"";
 const action=payload.action as Action;
 if(!["archive","restore","purge"].includes(action)||!pageImageId.test(id))return fail("Imagen o acción no válida.",400);
 const pages=await getPageDefinitions(admin.tenantId);
 if(!pages.some(p=>p.slug===slug))return fail("Página no disponible.",404);
 if(action==="archive"&&payload.confirm!=="ARCHIVAR")return fail("Confirma el traslado a la papelera.",400);
 if(action==="purge"&&payload.confirm!=="ELIMINAR")return fail("Confirma la eliminación definitiva.",400);
 const live=pageImagePath(admin.tenantId,slug,id),trash=trashedMediaPath(admin.tenantId,slug,id);
 if(action==="archive"){
  let info;
  try{info=await stat(live);}catch{return fail("La imagen ya no está disponible.",404);}
  if(!info.isFile())return fail("La imagen no es válida.",404);
  if(Date.now()-info.mtimeMs<MEDIA_RECENT_MS)
   return fail("Esta imagen es reciente. Espera 24 horas para proteger ediciones sin guardar.",409);
  const used=await referencedTenantImages(admin.tenantId);
  if(used.has(id))return fail("La imagen está utilizada en una página o borrador. No puede archivarse.",409);
  try{
   await mkdir(dirname(trash),{recursive:true,mode:0o700});
   await copyFile(live,trash,constants.COPYFILE_EXCL);
   // Trash retention begins on archival, never on the older source upload date.
   const archivedAt=new Date();
   await utimes(trash,archivedAt,archivedAt);
   // Revalidate immediately before removing the original. Never move referenced media.
   const rechecked=await referencedTenantImages(admin.tenantId);
   if(rechecked.has(id)){await unlink(trash);return fail("La imagen acaba de utilizarse en otra sección.",409);}
   await unlink(live);
   return NextResponse.json({ok:true,action:"archived"},{headers:{"Cache-Control":"no-store"}});
  }catch(e){
   if(e&&typeof e==="object"&&"code" in e&&e.code==="EEXIST")return fail("La imagen ya se encuentra en la papelera.",409);
   // A failed archive must not discard the original; purge an incomplete trash copy.
   try{if(await hasPageImage(admin.tenantId,slug,id))await unlink(trash);}catch{}
   return fail("No se pudo mover la imagen. Inténtalo de nuevo.",500);
  }
 }
 let archived;
 try{archived=await stat(trash);}catch{return fail("No se encontró la imagen en la papelera.",404);}
 if(!archived.isFile())return fail("Archivo no válido.",404);
 if(action==="restore"){
  try{
   await mkdir(dirname(live),{recursive:true,mode:0o700});
   await copyFile(trash,live,constants.COPYFILE_EXCL);
   await unlink(trash);
   return NextResponse.json({ok:true,action:"restored"},{headers:{"Cache-Control":"no-store"}});
  }catch(e){
   if(e&&typeof e==="object"&&"code" in e&&e.code==="EEXIST")return fail("Ya existe una imagen activa con ese identificador.",409);
   return fail("No se pudo restaurar la imagen.",500);
  }
 }
 if(Date.now()-archived.mtimeMs<MEDIA_TRASH_RETENTION_MS)
  return fail("La imagen debe permanecer al menos siete días en la papelera.",409);
 if((await referencedTenantImages(admin.tenantId)).has(id))
  return fail("La imagen vuelve a estar referenciada; restáurala en lugar de eliminarla.",409);
 try{await unlink(trash);return NextResponse.json({ok:true,action:"purged"},{headers:{"Cache-Control":"no-store"}});}
 catch{return fail("No se pudo eliminar el archivo.",500);}
}
