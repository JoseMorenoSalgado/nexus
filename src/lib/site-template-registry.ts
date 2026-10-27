/** Built-in website templates. This module is safe to import in client UI. */
export const SITE_TEMPLATES=[
 {key:"real-estate",label:"Inmobiliaria",description:"Catálogo de propiedades, fichas PDF, WhatsApp y captación de prospectos"},
 {key:"education",label:"Educación",description:"Cursos, programas, presentación institucional y solicitudes de información"},
 {key:"services",label:"Servicios",description:"Servicios profesionales, propuestas de valor y contacto comercial"},
 {key:"ecommerce",label:"Comercio electrónico",description:"Sitio comercial y presentación de productos; carrito e inventario estarán disponibles próximamente"}
] as const;
export type SiteTemplateKey=typeof SITE_TEMPLATES[number]["key"];
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
  cards:[{title:"Compra y venta",description:"Opciones para dar el siguiente paso."},{title:"Alquiler",description:"Encuentra alternativas para tu futuro."},{title:"Asesoría",description:"Atención cercana y clara."}],
  contactTitle:"Conversemos sobre tu propiedad",contactText:"Escríbenos para conocer las opciones disponibles."
 },
 education:{
  eyebrow:"FORMACIÓN Y APRENDIZAJE",headline:"Aprender abre nuevas oportunidades",
  description:"Conoce nuestra institución, sus programas y oportunidades de formación.",
  actionLabel:"Explorar programas",aboutTitle:"Comprometidos con tu aprendizaje",
  aboutText:"Ofrecemos experiencias formativas orientadas al desarrollo de conocimientos y habilidades.",
  cards:[{title:"Programas de formación",description:"Conoce nuestras propuestas educativas."},{title:"Acompañamiento",description:"Aprende con orientación y seguimiento."},{title:"Comunidad educativa",description:"Crece y comparte nuevas experiencias."}],
  contactTitle:"Conoce nuestras opciones de formación",contactText:"Solicita información sobre programas, admisiones y disponibilidad."
 },
 services:{
  eyebrow:"SOLUCIONES A TU MEDIDA",headline:"Servicios profesionales para tus proyectos",
  description:"Descubre cómo podemos ayudarte y conoce lo que hacemos.",
  actionLabel:"Ver servicios",aboutTitle:"Un equipo enfocado en tus objetivos",
  aboutText:"Trabajamos para ofrecer soluciones con atención cercana y procesos claros.",
  cards:[{title:"Asesoría",description:"Analizamos tus necesidades para definir el siguiente paso."},{title:"Soluciones",description:"Servicios adaptados a las necesidades de cada proyecto."},{title:"Atención personalizada",description:"Hablemos para encontrar la opción adecuada."}],
  contactTitle:"Conversemos sobre tu proyecto",contactText:"Cuéntanos lo que necesitas y nuestro equipo te responderá."
 },
 ecommerce:{
  eyebrow:"COMERCIO EN LÍNEA",headline:"Tu marca, tu tienda digital",
  description:"Presenta tus productos y servicios en un sitio web profesional. La venta en línea se habilitará en una próxima fase.",
  actionLabel:"Conoce nuestra oferta",aboutTitle:"Descubre nuestra marca",
  aboutText:"Ofrecemos productos y atención personalizada para nuestros clientes.",
  cards:[{title:"Nuestra selección",description:"Conoce nuestras líneas de productos."},{title:"Atención personalizada",description:"Consulta disponibilidad y detalles."},{title:"Compra informada",description:"Resolvemos tus preguntas antes de comprar."}],
  contactTitle:"Hablemos de lo que necesitas",contactText:"Contáctanos para conocer productos y disponibilidad."
 }
};
export function isTemplateKey(value:unknown):value is SiteTemplateKey{
 return typeof value==="string"&&SITE_TEMPLATES.some(x=>x.key===value);
}
export function normalizeTemplateContent(key:SiteTemplateKey,input:unknown):TemplateContent{
 const defaults=TEMPLATE_DEFAULTS[key];
 if(!input||typeof input!=="object"||Array.isArray(input))return structuredClone(defaults);
 const o=input as Record<string,unknown>;
 const safe=(value:unknown,fallback:string,max:number)=>{
  return typeof value==="string"&&value.trim().length>=2&&value.trim().length<=max?value.trim():fallback;
 };
 const raw=Array.isArray(o.cards)?o.cards:[];
 return {
  eyebrow:safe(o.eyebrow,defaults.eyebrow,90),
  headline:safe(o.headline,defaults.headline,120),
  description:safe(o.description,defaults.description,450),
  actionLabel:safe(o.actionLabel,defaults.actionLabel,55),
  aboutTitle:safe(o.aboutTitle,defaults.aboutTitle,120),
  aboutText:safe(o.aboutText,defaults.aboutText,1400),
  cards:defaults.cards.map((card,index)=>{
   const item=raw[index];
   const data=item&&typeof item==="object"&&!Array.isArray(item)?item as Record<string,unknown>:{};
   return {title:safe(data.title,card.title,90),description:safe(data.description,card.description,350)};
  }),
  contactTitle:safe(o.contactTitle,defaults.contactTitle,120),
  contactText:safe(o.contactText,defaults.contactText,450)
 };
}
