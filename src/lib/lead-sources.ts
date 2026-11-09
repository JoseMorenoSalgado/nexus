import "server-only";
import {getStandalonePrisma} from "@/lib/prisma-standalone";
import {prisma} from "@/lib/prisma";

export const DEFAULT_LEAD_SOURCES=[
 {code:"web",name:"Formulario web"},{code:"whatsapp",name:"WhatsApp"},
 {code:"telefono",name:"Llamada telefónica"},{code:"manual",name:"Atención directa"},
 {code:"marketplace",name:"Marketplace"},{code:"facebook",name:"Facebook"},
 {code:"instagram",name:"Instagram"},{code:"tiktok",name:"TikTok"},
 {code:"referido",name:"Referido"},{code:"cliente",name:"Cliente"}
] as const;
export function validLeadSourceCode(code:string){return /^[a-z][a-z0-9-]{1,30}$/.test(code);}
type LeadSource={code:string;name:string;active:boolean};
const select={code:true,name:true,active:true} as const;
export async function independentLeadSources(){
 return mergeLeadSources(await getStandalonePrisma().leadSource.findMany({select}));
}
export async function tenantLeadSources(tenantId:string){
 return mergeLeadSources(await prisma.leadSource.findMany({where:{tenantId},select}));
}
function mergeLeadSources(stored:LeadSource[]){
 const merged=new Map<string,LeadSource>(
  DEFAULT_LEAD_SOURCES.map(s=>[s.code,{...s,active:true}])
 );
 for(const source of stored)merged.set(source.code,source);
 return [...merged.values()].sort((a,b)=>a.name.localeCompare(b.name,"es"));
}
