import "server-only";
import {prisma} from "@/lib/prisma";

export const DEFAULT_LEAD_SOURCES=[
 {code:"web",name:"Formulario web"},{code:"whatsapp",name:"WhatsApp"},
 {code:"telefono",name:"Llamada telefónica"},{code:"manual",name:"Atención directa"},
 {code:"marketplace",name:"Marketplace"},{code:"facebook",name:"Facebook"},
 {code:"instagram",name:"Instagram"},{code:"tiktok",name:"TikTok"},
 {code:"referido",name:"Referido"},{code:"cliente",name:"Cliente"}
] as const;
export function validLeadSourceCode(code:string){return /^[a-z][a-z0-9-]{1,30}$/.test(code);}
export async function tenantLeadSources(tenantId:string){
 const stored=await prisma.leadSource.findMany({where:{tenantId},
  select:{code:true,name:true,active:true},orderBy:{name:"asc"}});
 const merged=new Map<string,{code:string;name:string;active:boolean}>(
  DEFAULT_LEAD_SOURCES.map(s=>[s.code,{...s,active:true}])
 );
 for(const source of stored)merged.set(source.code,source);
 return [...merged.values()].sort((a,b)=>a.name.localeCompare(b.name,"es"));
}
