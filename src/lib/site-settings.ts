import "server-only";
import {prisma} from "@/lib/prisma";
import {type Prisma} from "@prisma/client";
import {NEXUS_SITE_DEFAULTS} from "@/lib/templates/nexus-defaults";

export type SiteSettings={
 heroEyebrow:string;heroHeading:string;heroHighlight:string;heroDescription:string;heroButton:string;
 sectionEyebrow:string;sectionHeading:string;sectionHighlight:string;sectionDescription:string;
 aboutTitle:string;aboutDescription:string;aboutMission:string;aboutVision:string;
 servicesHeading:string;servicesDescription:string;servicesSale:string;servicesRent:string;servicesAdvice:string;
 contactHeading:string;contactHighlight:string;contactDescription:string;
 featuredIds:string[];
};
export const DEFAULT_SITE_SETTINGS:SiteSettings=NEXUS_SITE_DEFAULTS;
const constraints:{[K in Exclude<keyof SiteSettings,"featuredIds">]:number}={
 heroEyebrow:90,heroHeading:95,heroHighlight:90,heroDescription:480,heroButton:45,
 sectionEyebrow:90,sectionHeading:95,sectionHighlight:90,sectionDescription:320,
 aboutTitle:100,aboutDescription:360,aboutMission:400,aboutVision:400,
 servicesHeading:110,servicesDescription:380,servicesSale:400,servicesRent:400,servicesAdvice:400,
 contactHeading:100,contactHighlight:100,contactDescription:360
};
export class SiteSettingsError extends Error{}
export function parseSiteSettings(input:FormData):SiteSettings{
 const result={...DEFAULT_SITE_SETTINGS,featuredIds:[] as string[]};
 for(const key of Object.keys(constraints) as Array<keyof typeof constraints>){
  const value=input.get(key);
  if(value===null&&["aboutMission","aboutVision","servicesHeading","servicesDescription","servicesSale","servicesRent","servicesAdvice"].includes(key))continue;
  if(typeof value!=="string"||value.length>constraints[key]+50)throw new SiteSettingsError("Revisa las longitudes de los textos.");
  const cleaned=value.trim().replace(/[\u0000-\u001F\u007F]/g," ");
  if(cleaned.length<2||cleaned.length>constraints[key])throw new SiteSettingsError("Los textos no deben quedar vacíos ni superar el límite.");
  result[key]=cleaned;
 }
 const featured=input.getAll("featuredIds");
 if(featured.length>3||featured.some(v=>typeof v!=="string"||!/^[a-z0-9]{10,50}$/.test(v)))throw new SiteSettingsError("Selecciona como máximo tres inmuebles.");
 const unique=[...new Set(featured as string[])];
 if(unique.length!==featured.length)throw new SiteSettingsError("No repitas propiedades destacadas.");
 result.featuredIds=unique;
 return result;
}
export function normalizeSiteSettings(value:unknown):SiteSettings{
 if(!value||typeof value!=="object"||Array.isArray(value))return {...DEFAULT_SITE_SETTINGS};
 const raw=value as Record<string,unknown>;
 const copy={...DEFAULT_SITE_SETTINGS,featuredIds:[] as string[]};
 for(const key of Object.keys(constraints) as Array<keyof typeof constraints>){
  const v=raw[key];
  if(typeof v==="string"&&v.length>=2&&v.length<=constraints[key])copy[key]=v;
 }
 if(Array.isArray(raw.featuredIds)){
  copy.featuredIds=raw.featuredIds.filter((v):v is string=>typeof v==="string"&&/^[a-z0-9]{10,50}$/.test(v)).slice(0,3);
 }
 return copy;
}
export async function getSiteSettings(tenantId:string):Promise<SiteSettings>{
 const page=await prisma.sitePage.findUnique({where:{tenantId_slug:{tenantId,slug:"home"}},select:{blocks:true,published:true}});
 return page?.published?normalizeSiteSettings(page.blocks):{...DEFAULT_SITE_SETTINGS};
}
export async function saveSiteSettings(tenantId:string,settings:SiteSettings){
 await prisma.sitePage.upsert({
  where:{tenantId_slug:{tenantId,slug:"home"}},
  create:{tenantId,slug:"home",title:"Inicio",blocks:settings as unknown as Prisma.InputJsonValue,published:true},
  update:{blocks:settings as unknown as Prisma.InputJsonValue,published:true,title:"Inicio"}
 });
}
export function validateBrandContact(form:FormData,options:{legacyLocalCode?:string}={}){
 const val=(key:string,max:number)=>{
  const v=form.get(key);
  if(typeof v!=="string"||v.length>max+25)throw new SiteSettingsError("Datos de contacto demasiado extensos.");
  return v.trim();
 };
 const tagline=val("tagline",110),email=val("contactEmail",180),phone=val("whatsapp",35);
 const color=val("primaryColor",7);
 if(tagline.length>110||email.length>180)throw new SiteSettingsError("Revisa los datos de contacto.");
 if(email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw new SiteSettingsError("Correo de contacto inválido.");
 const digits=phone.replace(/\D/g,"");
 if(phone&&!/^\+?[0-9\s()-]{8,35}$/.test(phone))throw new SiteSettingsError("Escribe un número telefónico válido.");
 if(phone&&(digits.length<8||digits.length>15))throw new SiteSettingsError("El número de WhatsApp debe incluir un indicativo internacional.");
 if(!/^#[0-9a-fA-F]{6}$/.test(color))throw new SiteSettingsError("Color corporativo inválido.");
 const channels=[1,3,5].map(i=>parseInt(color.slice(i,i+2),16)/255).map(v=>v<=0.04045?v/12.92:((v+0.055)/1.055)**2.4);
 const luminance=0.2126*channels[0]+0.7152*channels[1]+0.0722*channels[2];
 if(luminance>0.18)throw new SiteSettingsError("Selecciona un color más oscuro para mantener contraste con texto blanco.");
 // The original NEXUS installation accepted eight-digit local numbers.
 // For every other organization, require an explicit international code.
 if(digits.length===8&&!options.legacyLocalCode)throw new SiteSettingsError("Incluye el indicativo internacional de WhatsApp.");
 const normalized=digits.length===8&&options.legacyLocalCode?options.legacyLocalCode+digits:digits;
 return {tagline,contactEmail:email||null,whatsapp:normalized||null,primaryColor:color.toUpperCase()};
}
