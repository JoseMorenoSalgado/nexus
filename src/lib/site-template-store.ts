import "server-only";
import {prisma} from "@/lib/prisma";
import {type Prisma} from "@prisma/client";
import {SITE_TEMPLATES,TEMPLATE_DEFAULTS,isTemplateKey,normalizeTemplateContent,type SiteTemplateKey,type TemplateContent} from "@/lib/site-template-registry";

export const TEMPLATE_PAGE_SLUG="site-template";
export type SiteTemplate={key:SiteTemplateKey;content:TemplateContent};
function blocksObject(value:unknown):Record<string,unknown>{
 return value&&typeof value==="object"&&!Array.isArray(value)?value as Record<string,unknown>:{};
}
export async function getSiteTemplate(tenantId:string):Promise<SiteTemplate>{
 if(tenantId==="demo")return {key:"real-estate",content:structuredClone(TEMPLATE_DEFAULTS["real-estate"])};
 const record=await prisma.sitePage.findUnique({
  where:{tenantId_slug:{tenantId,slug:TEMPLATE_PAGE_SLUG}},select:{blocks:true}
 });
 const blocks=blocksObject(record?.blocks);
 const key=isTemplateKey(blocks.key)?blocks.key:"real-estate"; // existing customers keep NEXUS unchanged
 const drafts=blocksObject(blocks.contentByTemplate);
 return {key,content:normalizeTemplateContent(key,drafts[key])};
}
/**
 * One tenant-scoped read populates the template gallery. Merely previewing
 * never updates the selected template or draft content.
 */
export async function getTemplateLibrary(tenantId:string):Promise<{
 selected:SiteTemplateKey;
 variants:Record<SiteTemplateKey,TemplateContent>;
}>{
 const record=tenantId==="demo"?null:await prisma.sitePage.findUnique({
  where:{tenantId_slug:{tenantId,slug:TEMPLATE_PAGE_SLUG}},select:{blocks:true}
 });
 const blocks=blocksObject(record?.blocks);
 const selected=isTemplateKey(blocks.key)?blocks.key:"real-estate";
 const drafts=blocksObject(blocks.contentByTemplate);
 const variants=Object.fromEntries(SITE_TEMPLATES.map(({key})=>[
  key,normalizeTemplateContent(key,drafts[key])
 ])) as Record<SiteTemplateKey,TemplateContent>;
 return {selected,variants};
}
export async function updateSiteTemplate(tenantId:string,intent:"select"|"content",selected:SiteTemplateKey,form?:FormData){
 await prisma.$transaction(async tx=>{
  const record=await tx.sitePage.findUnique({
   where:{tenantId_slug:{tenantId,slug:TEMPLATE_PAGE_SLUG}},select:{blocks:true}
  });
  const blocks=blocksObject(record?.blocks);
  const key=isTemplateKey(blocks.key)?blocks.key:"real-estate";
  const drafts=blocksObject(blocks.contentByTemplate);
  if(intent==="content"){
   if(key!==selected||!form)throw Error("TEMPLATE_CHANGED");
   const raw:Record<string,unknown>={};
   for(const [field,max] of Object.entries({
    eyebrow:90,headline:120,description:450,actionLabel:55,aboutTitle:120,aboutText:1400,contactTitle:120,contactText:450
   })){
    const value=form.get(field);
    if(typeof value!=="string"||value.trim().length<2||value.trim().length>max)throw Error("TEMPLATE_INVALID");
    raw[field]=value.trim();
   }
   raw.cards=[0,1,2].map(i=>{
    const title=form.get("cardTitle"+i),description=form.get("cardDescription"+i);
    if(typeof title!=="string"||title.trim().length<2||title.trim().length>90||typeof description!=="string"||description.trim().length<2||description.trim().length>350)throw Error("TEMPLATE_INVALID");
    return {title:title.trim(),description:description.trim()};
   });
   drafts[key]=normalizeTemplateContent(key,raw);
  }
  const next={key:intent==="select"?selected:key,contentByTemplate:drafts};
  await tx.sitePage.upsert({
   where:{tenantId_slug:{tenantId,slug:TEMPLATE_PAGE_SLUG}},
   create:{tenantId,slug:TEMPLATE_PAGE_SLUG,title:"Plantilla del sitio",blocks:next as Prisma.InputJsonValue,published:true},
   update:{blocks:next as Prisma.InputJsonValue,published:true}
  });
 });
}
