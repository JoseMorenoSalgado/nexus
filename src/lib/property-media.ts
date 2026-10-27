import "server-only";
import {join} from "node:path";
import {configDir} from "@/lib/server-config";

export const MAX_PHOTOS=15;
export const MAX_IMAGE_BYTES=8*1024*1024;
export function isPhotoId(id:string){
 return /^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/.test(id);
}
export function mediaFilePath(tenantId:string,id:string){
 if(!/^[a-z0-9]{10,50}$/.test(tenantId)||!isPhotoId(id))throw new Error("Identificador de archivo inválido");
 return join(configDir(),"media",tenantId,id+".webp");
}

export type MediaVariant="card"|"thumb";
export function mediaVariantPath(tenantId:string,id:string,variant:MediaVariant){
 return mediaFilePath(tenantId,id).replace(/\.webp$/, "."+variant+".webp");
}
export function mediaVariantUrl(url:string,variant:MediaVariant){
 return /^\/api\/media\/[a-f0-9-]{36}$/.test(url)?url+"?variant="+variant:url;
}
