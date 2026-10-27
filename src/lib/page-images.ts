import "server-only";
import {readFile,stat} from "node:fs/promises";
import {join} from "node:path";
import {configDir} from "@/lib/server-config";
import {validCustomSlug} from "@/lib/page-slug";
import {pageImageId} from "@/lib/page-sections";
export const PAGE_IMAGE_MAX_BYTES=8*1024*1024;
export function pageImagePath(tenantId:string,slug:string,id:string){
 if(!/^[a-z0-9]{10,50}$/.test(tenantId)||!validCustomSlug(slug)||!pageImageId.test(id))throw Error("IMAGE_PATH_INVALID");
 return join(configDir(),"page-images",tenantId,slug,id+".webp");
}
export async function readPageImage(tenantId:string,slug:string,id:string){
 try{return await readFile(pageImagePath(tenantId,slug,id));}catch{return null;}
}
export async function hasPageImage(tenantId:string,slug:string,id:string){
 try{return (await stat(pageImagePath(tenantId,slug,id))).isFile();}catch{return false;}
}
