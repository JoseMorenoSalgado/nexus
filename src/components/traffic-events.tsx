"use client";
import {useEffect} from "react";
import {usePathname} from "next/navigation";
import {MessageCircle} from "lucide-react";
import {type PublicTenant,type PublicProperty,contactUrl} from "@/lib/demo";
function log(kind:"view"|"whatsapp"){const body=JSON.stringify({kind,path:location.pathname});if(navigator.sendBeacon)navigator.sendBeacon("/api/events",new Blob([body],{type:"application/json"}));}
export function PageView(){useEffect(()=>{log("view");},[]);return null;}
export function WhatsAppButton({tenant,property}:{tenant:PublicTenant;property?:PublicProperty}){
 const href=contactUrl(tenant,property),enabled=Boolean(tenant.whatsapp);
 return <a className="btn btn-whatsapp" href={href} target={enabled?"_blank":undefined} rel={enabled?"noopener noreferrer":undefined} onClick={()=>{if(enabled)log("whatsapp");}}>Consultar por WhatsApp →</a>;
}
export function FloatingWhatsapp({tenant,property,}:{tenant:PublicTenant;property?:PublicProperty}){
 const pathname=usePathname();
 if(!tenant.whatsapp)return null;
 const advisory=pathname==="/asesoria-empresarial";
 const digits=tenant.whatsapp.replace(/\D/g,"");
 const href=advisory&&digits
  ?"https://wa.me/"+digits+"?text="+encodeURIComponent("Hola, deseo información sobre los servicios de asesoría empresarial, auditoría externa y capacitación LA/FT/FP.")
  :contactUrl(tenant,property);
 return <a className="floating-wa" href={href} target="_blank" rel="noopener noreferrer" aria-label={advisory?"Consultar sobre asesoría empresarial por WhatsApp":"Consultar por WhatsApp"} onClick={()=>log("whatsapp")}><MessageCircle size={28}/></a>;
}
