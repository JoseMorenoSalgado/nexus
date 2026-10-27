export const CRM_STATUSES=[
 {value:"nuevo",label:"Nuevo",description:"Consulta recién recibida"},
 {value:"contactado",label:"Contactado",description:"Ya se estableció comunicación"},
 {value:"visita",label:"Visita programada",description:"Recorrido o reunión pendiente"},
 {value:"negociacion",label:"En negociación",description:"Oferta o condiciones en análisis"},
 {value:"cerrado",label:"Cerrado",description:"Gestión completada"},
 {value:"descartado",label:"Descartado",description:"Consulta que no continuará"}
] as const;
export type CrmStatus=(typeof CRM_STATUSES)[number]["value"];
export function isCrmStatus(x:string):x is CrmStatus{return CRM_STATUSES.some(s=>s.value===x);}
export function crmStatusLabel(s:string){return CRM_STATUSES.find(x=>x.value===s)?.label||"Nuevo";}
export function whatsappLeadUrl(phone:string,tenantName:string,refCode?:string){
 const normalized=phone.replace(/\D/g,"");
 if(normalized.length<8||normalized.length>15)return null;
 // NEXUS serves Nicaragua; local eight-digit contacts use its calling code.
 const dial=normalized.length===8&&tenantName.toLowerCase()==="nexus real estate"?"505"+normalized:normalized;
 const text=refCode?
  "Hola, te contactamos de "+tenantName+" en relación con la propiedad Ref: "+refCode+" que nos consultaste.":
  "Hola, te contactamos de "+tenantName+" por la consulta que nos enviaste.";
 return "https://wa.me/"+dial+"?text="+encodeURIComponent(text);
}
