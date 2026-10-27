import "server-only";
import {readdir,stat} from "node:fs/promises";
import {join} from "node:path";
import {prisma} from "@/lib/prisma";
import {getPageDefinitions} from "@/lib/site-pages";
import {configDir} from "@/lib/server-config";
import {pageImageId} from "@/lib/page-sections";
import {pageImagePath} from "@/lib/page-images";

export const MEDIA_RECENT_MS=24*60*60*1000;
export const MEDIA_TRASH_RETENTION_MS=7*24*60*60*1000;
export type TenantMedia={
 id:string;slug:string;pageTitle:string;url:string;
 used:boolean;recent:boolean;canArchive:boolean;
};
export type TrashedMedia={id:string;slug:string;pageTitle:string;canPurge:boolean};

/** Checks *all* stored sections, including drafts, inactive templates and unpublished pages.
 * A section being absent from public navigation does NOT mean its image is unused. */
export async function referencedTenantImages(tenantId:string):Promise<Set<string>>{
 const pages=await prisma.sitePage.findMany({where:{tenantId},select:{blocks:true}});
 const used=new Set<string>();
 for(const page of pages){
  const raw=page.blocks;
  if(!raw||typeof raw!=="object"||Array.isArray(raw))continue;
  const data=raw as Record<string,unknown>;
  // Conservative: keep references even if a legacy block has an invalid
  // caption/alt field. Never infer that a corrupted block frees its image.
  if(!Array.isArray(data.sections))continue;
  for(const section of data.sections){
   if(!section||typeof section!=="object"||Array.isArray(section))continue;
   const id=(section as Record<string,unknown>).imageId;
   if(typeof id==="string"&&pageImageId.test(id))used.add(id);
  }
 }
 return used;
}
export function mediaInUse(used:Set<string>,id:string){return used.has(id);}
/** Read-only, bounded listing of images stored by one tenant. */
export async function listTenantMedia(tenantId:string):Promise<TenantMedia[]>{
 const [pages,used]=await Promise.all([getPageDefinitions(tenantId),referencedTenantImages(tenantId)]);
 const base=join(configDir(),"page-images",tenantId);
 const items:TenantMedia[]=[];
 const now=Date.now();
 for(const page of pages.slice(0,150)){
  if(items.length>=120)break;
  let filenames:string[];
  try{filenames=await readdir(join(base,page.slug));}catch{continue;}
  for(const filename of filenames.slice(0,60)){
   const match=/^([a-f0-9]{32})\.webp$/.exec(filename);
   if(!match)continue;
   const id=match[1];
   const path=pageImagePath(tenantId,page.slug,id);
   let modified:number;
   try{const info=await stat(path);if(!info.isFile())continue;modified=info.mtimeMs;}
   catch{continue;}
   const recent=now-modified<MEDIA_RECENT_MS;
   const inUse=mediaInUse(used,id);
   items.push({id,slug:page.slug,pageTitle:page.title,
    url:"/api/admin/site-pages/"+encodeURIComponent(page.slug)+"/images/"+id,
    used:inUse,recent,canArchive:!inUse&&!recent});
   if(items.length>=120)break;
  }
 }
 return items;
}
export function trashedMediaPath(tenantId:string,slug:string,id:string){
 // Reuse pageImagePath validation, then construct the private trash tree.
 pageImagePath(tenantId,slug,id);
 return join(configDir(),"page-images-trash",tenantId,slug,id+".webp");
}
export async function listTrashedMedia(tenantId:string):Promise<TrashedMedia[]>{
 const pages=await getPageDefinitions(tenantId);
 const base=join(configDir(),"page-images-trash",tenantId);
 const result:TrashedMedia[]=[];
 const now=Date.now();
 for(const page of pages.slice(0,150)){
  if(result.length>=60)break;
  let filenames:string[];
  try{filenames=await readdir(join(base,page.slug));}catch{continue;}
  for(const filename of filenames.slice(0,60)){
   const match=/^([a-f0-9]{32})\.webp$/.exec(filename);
   if(!match)continue;
   const id=match[1];
   try{
    const info=await stat(trashedMediaPath(tenantId,page.slug,id));
    if(!info.isFile())continue;
    result.push({id,slug:page.slug,pageTitle:page.title,
     canPurge:now-info.mtimeMs>=MEDIA_TRASH_RETENTION_MS});
   }catch{continue;}
   if(result.length>=60)break;
  }
 }
 return result;
}
