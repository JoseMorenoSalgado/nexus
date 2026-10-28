import "server-only";
import {stat,readFile} from "node:fs/promises";
import {join} from "node:path";
import {configDir} from "@/lib/server-config";
export const PAGE_HERO_KINDS=["hero","hero-propiedades","hero-nosotros","hero-servicios","hero-contacto","hero-asesoria-empresarial"] as const;
export type PageHeroKind=typeof PAGE_HERO_KINDS[number];
export type SiteAssetKind=PageHeroKind|"logo"|"about-photo";
export function heroKindForPage(slug:string):PageHeroKind|null{
 if(slug==="home")return "hero";
 const key="hero-"+slug;
 return (PAGE_HERO_KINDS as readonly string[]).includes(key)?key as PageHeroKind:null;
}
export const SITE_ASSET_MAX_BYTES=8*1024*1024;
export function isSiteAssetKind(x:string):x is SiteAssetKind{
 return x==="logo"||x==="about-photo"||(PAGE_HERO_KINDS as readonly string[]).includes(x);
}
export function siteAssetPath(tenantId:string,kind:SiteAssetKind){
 if(!/^[a-z0-9]{10,50}$/.test(tenantId))throw new Error("Identificador de empresa inválido");
 return join(configDir(),"site-media",tenantId,kind+".webp");
}
export async function hasSiteAsset(tenantId:string,kind:SiteAssetKind){
 try{return (await stat(siteAssetPath(tenantId,kind))).isFile();}catch{return false;}
}
export async function readSiteAsset(tenantId:string,kind:SiteAssetKind){
 try{return await readFile(siteAssetPath(tenantId,kind));}catch{return null;}
}
