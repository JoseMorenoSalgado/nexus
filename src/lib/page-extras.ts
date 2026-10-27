import "server-only";
import {prisma} from "@/lib/prisma";
import {type Prisma} from "@prisma/client";
import {type PageSection,normalizePageSections} from "@/lib/page-sections";
import {getPageDefinitions} from "@/lib/site-pages";
import {getSiteTemplate} from "@/lib/site-template-store";

export const BUILTIN_PAGE_SLUGS=["home","propiedades","nosotros","servicios","contacto","asesoria-empresarial"] as const;
export type BuiltinPageSlug=typeof BUILTIN_PAGE_SLUGS[number];
export function isBuiltinPageSlug(slug:string):slug is BuiltinPageSlug{
 return (BUILTIN_PAGE_SLUGS as readonly string[]).includes(slug);
}
function storageSlug(slug:BuiltinPageSlug){return "site-extras-"+slug;}
export async function readExtraSections(tenantId:string,slug:BuiltinPageSlug):Promise<PageSection[]>{
 const record=await prisma.sitePage.findUnique({
  where:{tenantId_slug:{tenantId,slug:storageSlug(slug)}},select:{blocks:true}
 });
 const data=record?.blocks&&typeof record.blocks==="object"&&!Array.isArray(record.blocks)
  ?record.blocks as Record<string,unknown>:{};
 return normalizePageSections(data.sections);
}
export async function saveExtraSections(tenantId:string,slug:BuiltinPageSlug,sections:PageSection[]){
 const payload={sections} as Prisma.InputJsonValue;
 await prisma.sitePage.upsert({where:{tenantId_slug:{tenantId,slug:storageSlug(slug)}},
  create:{tenantId,slug:storageSlug(slug),title:"Secciones adicionales: "+slug,blocks:payload,published:true},
  update:{blocks:payload,published:true}});
}
/** Built-in pages must really be usable by the current tenant and template.
 * The home page is always public, others respect draft state and enabled modules. */
export async function builtinPageAvailable(tenantId:string,slug:BuiltinPageSlug):Promise<boolean>{
 const template=await getSiteTemplate(tenantId);
 if(slug==="propiedades"&&template.key!=="real-estate")return false;
 const pages=await getPageDefinitions(tenantId);
 return pages.some(page=>page.slug===slug);
}
export async function builtinPagePublic(tenantId:string,slug:BuiltinPageSlug):Promise<boolean>{
 const pages=await getPageDefinitions(tenantId);
 return pages.some(page=>page.slug===slug&&page.published);
}
