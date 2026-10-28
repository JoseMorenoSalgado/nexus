import {type PublicTenant} from "@/lib/demo";
import {type SiteTemplateKey} from "@/lib/site-template-registry";

/**
 * This is presentation-only separation, not yet a tenant-selectable CMS theme.
 * Existing NEXUS pages keep their approved labels and fallback image.
 * The first-run installer can save the full legal/trading name.
 */
export function isNexusBrandName(name:string){
 const normalized=name.trim().toLocaleLowerCase("es").replace(/\s+/g," ");
 return normalized==="nexus real estate"||normalized==="nexus real estate nicaragua";
}
export function sitePresentation(tenant:PublicTenant,templateKey:SiteTemplateKey="real-estate"){
 const nexus=templateKey==="real-estate"&&isNexusBrandName(tenant.name);
 return nexus?{
  variant:"nexus" as const,
  name:"NEXUS",subtitle:"REAL ESTATE",fallbackLogo:"/brand/nexus-icon.webp",
  footerTitle:"Encuentra el lugar donde comienza tu siguiente historia.",
  footerDescription:tenant.tagline||"Te acompañamos en la búsqueda de tu próxima propiedad.",
  footerAction:"Hablemos de tu proyecto",
  contactRegion:"Nicaragua",footerNotice:"Información sujeta a disponibilidad y confirmación.",
  contactAction:"Hablemos"
 }:{
  variant:"organization" as const,
  name:tenant.name,subtitle:tenant.tagline||"Sitio oficial",fallbackLogo:null,
  footerTitle:"Conoce más sobre "+tenant.name+".",
  footerDescription:tenant.tagline||"Explora nuestros contenidos y ponte en contacto.",
  footerAction:"Contáctanos",
  contactRegion:null,footerNotice:"Información sujeta a actualización.",
  contactAction:"Contacto"
 };
}
