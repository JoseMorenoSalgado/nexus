/** NEXUS is exclusively a real-estate CMS; other sectors belong to other repositories. */
export const SITE_TEMPLATES=[
 {key:"real-estate",label:"Inmobiliaria",description:"Catálogo de propiedades, fichas PDF, WhatsApp y captación de prospectos"}
] as const;
export type SiteTemplateKey="real-estate";
export type TemplateContent={
 eyebrow:string;headline:string;description:string;actionLabel:string;
 aboutTitle:string;aboutText:string;
 cards:{title:string;description:string}[];
 contactTitle:string;contactText:string;
};
export const TEMPLATE_DEFAULTS:Record<SiteTemplateKey,TemplateContent>={
 "real-estate":{
  eyebrow:"INMOBILIARIA",headline:"Encuentra el lugar ideal",description:"Conoce nuestras propiedades y recibe asesoría personalizada.",
  actionLabel:"Ver propiedades",aboutTitle:"Te acompañamos en cada paso",
  aboutText:"Encuentra un espacio que responda a tus necesidades.",
  cards:[{title:"Compra y venta",description:"Opciones para dar el siguiente paso."},{title:"Alquiler",description:"Encuentra alternativas para tu futuro."},{title:"Orientación inmobiliaria",description:"Atención cercana y clara."}],
  contactTitle:"Conversemos sobre tu propiedad",contactText:"Escríbenos para conocer las opciones disponibles."
 }
};
export function isTemplateKey(value:unknown):value is SiteTemplateKey{
 return value==="real-estate";
}
export function normalizeTemplateContent(key:SiteTemplateKey,input:unknown):TemplateContent{
 const defaults=TEMPLATE_DEFAULTS[key];
 if(!input||typeof input!=="object"||Array.isArray(input))return structuredClone(defaults);
 const o=input as Record<string,unknown>;
 const safe=(value:unknown,fallback:string,max:number)=>typeof value==="string"&&value.trim().length>=2&&value.trim().length<=max?value.trim():fallback;
 const raw=Array.isArray(o.cards)?o.cards:[];
 return {
  eyebrow:safe(o.eyebrow,defaults.eyebrow,90),headline:safe(o.headline,defaults.headline,120),
  description:safe(o.description,defaults.description,450),actionLabel:safe(o.actionLabel,defaults.actionLabel,55),
  aboutTitle:safe(o.aboutTitle,defaults.aboutTitle,120),aboutText:safe(o.aboutText,defaults.aboutText,1400),
  cards:defaults.cards.map((card,index)=>{
   const item=raw[index];
   const data=item&&typeof item==="object"&&!Array.isArray(item)?item as Record<string,unknown>:{};
   return {title:safe(data.title,card.title,90),description:safe(data.description,card.description,350)};
  }),
  contactTitle:safe(o.contactTitle,defaults.contactTitle,120),contactText:safe(o.contactText,defaults.contactText,450)
 };
}
