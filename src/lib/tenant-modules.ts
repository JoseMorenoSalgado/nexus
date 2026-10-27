import "server-only";
import {type Prisma} from "@prisma/client";
import {prisma} from "@/lib/prisma";
import {getSiteTemplate} from "@/lib/site-template-store";
import {defaultEnabledModules,normalizeEnabledModules,type ModuleKey} from "@/lib/tenant-modules-registry";
import {type SiteTemplateKey} from "@/lib/site-template-registry";

const SLUG="site-modules";
function obj(value:unknown):Record<string,unknown>{
 return value&&typeof value==="object"&&!Array.isArray(value)?value as Record<string,unknown>:{};
}
/** A tenant's enabled modules are independent from its visual template.
 * Previously installed tenants have backwards-compatible defaults.
 */
export async function getTenantModules(tenantId:string,sector?:SiteTemplateKey):Promise<ModuleKey[]>{
 const template=sector??(await getSiteTemplate(tenantId)).key;
 if(tenantId==="demo")return defaultEnabledModules(template);
 const row=await prisma.sitePage.findUnique({where:{tenantId_slug:{tenantId,slug:SLUG}},select:{blocks:true}});
 const byTemplate=obj(obj(row?.blocks).byTemplate);
 return normalizeEnabledModules(template,byTemplate[template]);
}
export async function updateTenantModules(tenantId:string,requested:unknown){
 const sector=(await getSiteTemplate(tenantId)).key;
 const enabled=normalizeEnabledModules(sector,requested,true);
 await prisma.$transaction(async tx=>{
  const existing=await tx.sitePage.findUnique({where:{tenantId_slug:{tenantId,slug:SLUG}},select:{blocks:true}});
  const prior=obj(obj(existing?.blocks).byTemplate);
  const blocks={version:1,byTemplate:{...prior,[sector]:enabled}};
  await tx.sitePage.upsert({
   where:{tenantId_slug:{tenantId,slug:SLUG}},
   create:{tenantId,slug:SLUG,title:"Módulos de la empresa",blocks:blocks as Prisma.InputJsonValue,published:false},
   update:{blocks:blocks as Prisma.InputJsonValue,published:false}
  });
 });
 return enabled;
}
export async function tenantModuleEnabled(tenantId:string,module:ModuleKey):Promise<boolean>{
 return (await getTenantModules(tenantId)).includes(module);
}
