import "server-only";
import {notFound} from "next/navigation";
import {type Prisma} from "@prisma/client";
import {prisma} from "@/lib/prisma";
import {getSiteTemplate} from "@/lib/site-template-store";
import {getTenantModules} from "@/lib/tenant-modules";
import {normalizePageSections,type PageSection} from "@/lib/page-sections";
import {validCustomSlug} from "@/lib/page-slug";
export {validCustomSlug} from "@/lib/page-slug";

export type SiteMenuItem={id:string;label:string;href:string};
export type PageDefinition={id:string;slug:string;title:string;href:string;published:boolean;builtIn:boolean;summary:string};
const staticPages=[
 {id:"home",slug:"home",title:"Inicio",href:"/"},
 {id:"propiedades",slug:"propiedades",title:"Propiedades",href:"/propiedades"},
 {id:"nosotros",slug:"nosotros",title:"Nosotros",href:"/nosotros"},
 {id:"servicios",slug:"servicios",title:"Servicios",href:"/servicios"},
 {id:"contacto",slug:"contacto",title:"Contacto",href:"/contacto"},
 {id:"asesoria-empresarial",slug:"asesoria-empresarial",title:"Asesoría Empresarial",href:"/asesoria-empresarial"}
] as const;
export const DEFAULT_SITE_MENU:SiteMenuItem[]=staticPages.filter(p=>p.id!=="asesoria-empresarial").map(p=>({id:p.id,label:p.title,href:p.href}));
/** Only real estate and its optional business-advisory page are available. */
export function defaultMenuForTemplate(_key:string):SiteMenuItem[]{
 return [...DEFAULT_SITE_MENU,{id:"asesoria-empresarial",label:"Asesoría Empresarial",href:"/asesoria-empresarial"}];
}
export const CUSTOM_PAGE_PREFIX="pagina-";
export const MENU_SLUG="site-navigation";
export function textBlocks(raw:unknown):{summary:string;body:string;sections:PageSection[]}{
 if(!raw||typeof raw!=="object"||Array.isArray(raw))return {summary:"",body:"",sections:[]};
 const obj=raw as Record<string,unknown>;
 return {summary:typeof obj.summary==="string"?obj.summary.slice(0,240):"",
  body:typeof obj.body==="string"?obj.body.slice(0,12000):"",sections:normalizePageSections(obj.sections)};
}
export async function getPageDefinitions(tenantId:string,options:{includeSummary?:boolean}={}):Promise<PageDefinition[]>{
 const template=await getSiteTemplate(tenantId);
 const available=await getTenantModules(tenantId,template.key);
 const enabledPages=staticPages.filter(p=>p.id!=="propiedades"||available.includes("properties"));
 // Public menus only need page titles and visibility, not potentially large JSON blocks.
 const where={tenantId,OR:[
  {slug:{in:staticPages.map(x=>x.slug)}},{slug:{startsWith:CUSTOM_PAGE_PREFIX}}
 ]};
 const rows=options.includeSummary===false
  ?await prisma.sitePage.findMany({where,select:{slug:true,title:true,published:true},orderBy:{updatedAt:"desc"}})
  :await prisma.sitePage.findMany({where,select:{slug:true,title:true,published:true,blocks:true},orderBy:{updatedAt:"desc"}});
 const lookup=new Map(rows.map(x=>[x.slug,x]));
 const builtins:PageDefinition[]=enabledPages.map(p=>({
  ...p,title:p.title,published:p.id==="home"?true:p.id==="asesoria-empresarial"?(lookup.get(p.slug)?.published===true):(lookup.get(p.slug)?.published??true),
  builtIn:true,summary:""
 }));
 const extras=rows.filter(r=>r.slug.startsWith(CUSTOM_PAGE_PREFIX)).map(r=>{
  const slug=r.slug.slice(CUSTOM_PAGE_PREFIX.length);
  return {id:"pagina:"+slug,slug,title:r.title,href:"/pagina/"+slug,
   published:r.published,builtIn:false,summary:options.includeSummary===false?"":textBlocks("blocks" in r?r.blocks:null).summary};
 }).filter(x=>validCustomSlug(x.slug));
 return [...builtins,...extras];
}
type MenuRecord={id:string;label:string};
export function normalizedMenu(value:unknown,pages:PageDefinition[]):SiteMenuItem[]{
 const allowed=new Map(pages.filter(p=>p.published).map(p=>[p.id,p]));
 const values=Array.isArray(value)?value:[];
 const used=new Set<string>();
 const result:SiteMenuItem[]=[];
 for(const item of values){
  if(!item||typeof item!=="object"||Array.isArray(item))continue;
  const data=item as Record<string,unknown>;
  const id=typeof data.id==="string"?data.id:"",label=typeof data.label==="string"?data.label.trim():"";
  const p=allowed.get(id);
  if(!p||used.has(id)||label.length<2||label.length>48)continue;
  used.add(id);result.push({id,label,href:p.href});
 }
 return result;
}
export async function getSiteMenu(tenantId:string,existingPages?:PageDefinition[]):Promise<SiteMenuItem[]>{
 const [pages,template,stored]=await Promise.all([
  existingPages||getPageDefinitions(tenantId,{includeSummary:false}),getSiteTemplate(tenantId),
  prisma.sitePage.findUnique({where:{tenantId_slug:{tenantId,slug:MENU_SLUG}},select:{blocks:true}})
 ]);
 const defaults=()=>normalizedMenu(defaultMenuForTemplate(template.key),pages);
 if(!stored)return defaults();
 const raw=stored.blocks&&typeof stored.blocks==="object"&&!Array.isArray(stored.blocks)
  ?stored.blocks as {items?:unknown;byTemplate?:unknown}:null;
 const byTemplate=raw?.byTemplate&&typeof raw.byTemplate==="object"&&!Array.isArray(raw.byTemplate)
  ?raw.byTemplate as Record<string,unknown>:{};
 const hasSelected=Object.hasOwn(byTemplate,template.key);
 // An existing customer with only legacy menu settings belongs to real-estate.
 const chosen=hasSelected?byTemplate[template.key]:raw?.items;
 if(chosen===null||chosen===undefined)return defaults();
 return normalizedMenu(chosen,pages);
}
export async function saveSiteMenu(tenantId:string,items:MenuRecord[]){
 const pages=await getPageDefinitions(tenantId);
 const parsed=normalizedMenu(items,pages);
 if(parsed.length!==items.length)throw new Error("MENU_INVALID");
 if(parsed.length>25)throw new Error("MENU_LIMIT");
 const currentTemplate=await getSiteTemplate(tenantId);
 const existing=await prisma.sitePage.findUnique({
  where:{tenantId_slug:{tenantId,slug:MENU_SLUG}},select:{blocks:true}
 });
 const currentBlocks=existing?.blocks&&typeof existing.blocks==="object"&&!Array.isArray(existing.blocks)
  ?existing.blocks as Record<string,unknown>:{};
 const previous=currentBlocks.byTemplate&&typeof currentBlocks.byTemplate==="object"&&!Array.isArray(currentBlocks.byTemplate)
  ?currentBlocks.byTemplate as Record<string,unknown>:{};
 const byTemplate={...previous,[currentTemplate.key]:parsed};
 const updated={
  items:parsed,
  byTemplate
 };
 await prisma.sitePage.upsert({
  where:{tenantId_slug:{tenantId,slug:MENU_SLUG}},
  create:{tenantId,slug:MENU_SLUG,title:"Menú principal",blocks:updated as Prisma.InputJsonValue,published:true},
  update:{blocks:updated as Prisma.InputJsonValue,published:true,title:"Menú principal"}
 });
}
export async function assertPagePublished(tenantId:string,isDemo:boolean,id:string){
 if(isDemo||id==="home")return;
 const row=await prisma.sitePage.findUnique({where:{tenantId_slug:{tenantId,slug:id}},select:{published:true}});
 if(row&&!row.published)notFound();
}
export async function getCustomPage(tenantId:string,slug:string){
 if(!validCustomSlug(slug))return null;
 return prisma.sitePage.findUnique({where:{tenantId_slug:{tenantId,slug:CUSTOM_PAGE_PREFIX+slug}},
  select:{slug:true,title:true,blocks:true,published:true}});
}
