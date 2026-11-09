import "server-only";
import {getStandalonePrisma} from "@/lib/prisma-standalone";
import {normalizeEnabledModules} from "@/lib/tenant-modules-registry";
import {type SiteTemplateKey} from "@/lib/site-template-registry";

export async function getStandaloneModules(template:SiteTemplateKey){
 const record=await getStandalonePrisma().sitePage.findUnique({where:{slug:"site-modules"},select:{blocks:true}});
 const blocks=record?.blocks;
 const byTemplate=blocks&&typeof blocks==="object"&&!Array.isArray(blocks)?blocks.byTemplate:null;
 const enabled=byTemplate&&typeof byTemplate==="object"&&!Array.isArray(byTemplate)?byTemplate[template]:undefined;
 return normalizeEnabledModules(template,enabled);
}
