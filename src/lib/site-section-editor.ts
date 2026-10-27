import "server-only";
import {prisma} from "@/lib/prisma";
import {getSiteSettings,parseSiteSettings,saveSiteSettings,SiteSettingsError,validateBrandContact,type SiteSettings} from "@/lib/site-settings";

export const SITE_EDIT_SECTIONS={
 home:["heroEyebrow","heroHeading","heroHighlight","heroDescription","heroButton"],
 propiedades:["sectionEyebrow","sectionHeading","sectionHighlight","sectionDescription","featuredIds"],
 nosotros:["aboutTitle","aboutDescription","aboutMission","aboutVision"],
 servicios:["servicesHeading","servicesDescription","servicesSale","servicesRent","servicesAdvice"],
 contacto:["contactHeading","contactHighlight","contactDescription"],
 identidad:[]
} as const;
export type SiteEditSection=keyof typeof SITE_EDIT_SECTIONS;
export const isSiteEditSection=(section:string):section is SiteEditSection=>Object.hasOwn(SITE_EDIT_SECTIONS,section);
const constraints:Record<Exclude<keyof SiteSettings,"featuredIds">,number>={
 heroEyebrow:90,heroHeading:95,heroHighlight:90,heroDescription:480,heroButton:45,
 sectionEyebrow:90,sectionHeading:95,sectionHighlight:90,sectionDescription:320,
 aboutTitle:100,aboutDescription:360,aboutMission:400,aboutVision:400,
 servicesHeading:110,servicesDescription:380,servicesSale:400,servicesRent:400,servicesAdvice:400,
 contactHeading:100,contactHighlight:100,contactDescription:360
};
export async function savePartialSiteSection(tenantId:string,section:Exclude<SiteEditSection,"identidad">,form:FormData){
 const existing=await getSiteSettings(tenantId);
 const patch:Partial<SiteSettings>={};
 const keys=SITE_EDIT_SECTIONS[section] as readonly string[];
 for(const key of keys){
  if(key==="featuredIds"){
   const ids=form.getAll("featuredIds");
   if(ids.length>3||ids.some(v=>typeof v!=="string"||!/^[a-z0-9]{10,50}$/.test(v))||
     new Set(ids).size!==ids.length)throw new SiteSettingsError("Máximo tres propiedades publicadas.");
   patch.featuredIds=ids as string[];
  }else{
   const k=key as Exclude<keyof SiteSettings,"featuredIds">,v=form.get(k);
   if(typeof v!=="string")throw new SiteSettingsError("Campo obligatorio.");
   const cleaned=v.trim().replace(/[\u0000-\u001F\u007F]/g," ");
   if(cleaned.length<2||cleaned.length>constraints[k])throw new SiteSettingsError("Texto inválido.");
   patch[k]=cleaned;
  }
 }
 if(section==="propiedades"&&patch.featuredIds?.length){
  const found=await prisma.property.count({where:{tenantId,id:{in:patch.featuredIds},published:true}});
  if(found!==patch.featuredIds.length)throw new SiteSettingsError("Las propiedades destacadas deben estar publicadas.");
 }
 // Restore the persisted values of every OTHER section, instead of overwriting them
 // with defaults from the old large form.
 const merged={...existing,...patch};
 await saveSiteSettings(tenantId,merged);
}
export async function savePartialBrand(tenantId:string,section:"contacto"|"identidad",form:FormData){
 const existing=await prisma.tenant.findUniqueOrThrow({where:{id:tenantId},
  select:{name:true,tagline:true,contactEmail:true,whatsapp:true,primaryColor:true}});
 const completed=new FormData();
 completed.set("tagline",section==="identidad"?(String(form.get("tagline")??"")):existing.tagline||"");
 completed.set("primaryColor",section==="identidad"?(String(form.get("primaryColor")??"")):existing.primaryColor);
 completed.set("contactEmail",section==="contacto"||form.has("contactEmail")?(String(form.get("contactEmail")??"")):existing.contactEmail||"");
 completed.set("whatsapp",section==="contacto"||form.has("whatsapp")?(String(form.get("whatsapp")??"")):existing.whatsapp||"");
 const legacyLocalCode=existing.name.trim().toLowerCase()==="nexus real estate"?"505":undefined;
 const brand=validateBrandContact(completed,{legacyLocalCode});
 if(section==="identidad")await prisma.tenant.update({where:{id:tenantId},
  data:{tagline:brand.tagline,primaryColor:brand.primaryColor,
   ...(form.has("contactEmail")?{contactEmail:brand.contactEmail}:{}),
   ...(form.has("whatsapp")?{whatsapp:brand.whatsapp}:{})}});
 else await prisma.tenant.update({where:{id:tenantId},
  data:{contactEmail:brand.contactEmail,whatsapp:brand.whatsapp}});
}
