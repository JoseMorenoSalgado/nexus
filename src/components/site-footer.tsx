import Link from "next/link";
import {ArrowUpRight,Mail,MapPin,MessageCircle} from "lucide-react";
import {type PublicTenant} from "@/lib/demo";
import {type SiteMenuItem} from "@/lib/site-pages";
import {type SiteTemplateKey} from "@/lib/site-template-registry";
import {sitePresentation} from "@/lib/site-presentation";
export function SiteFooter({tenant,links,templateKey="real-estate"}:{tenant:PublicTenant;links:SiteMenuItem[];templateKey?:SiteTemplateKey}){
 const presentation=sitePresentation(tenant,templateKey);
 return <footer className="nexus-footer">
  <div className="container nexus-footer-top">
   <div className="nexus-footer-intro">
    <span className="nexus-footer-mark">{tenant.name}</span>
    <h2>{presentation.footerTitle}</h2>
    <p>{presentation.footerDescription}</p>
    {links.some(x=>x.id==="contacto")&&<Link href="/contacto" className="nexus-footer-action">{presentation.footerAction} <ArrowUpRight size={18}/></Link>}
   </div>
   <div className="nexus-footer-links">
    <div><h3>Explorar</h3>
     {links.map(link=><Link key={link.id} href={link.href}>{link.label}</Link>)}
    </div>
    <div><h3>Contacto</h3>
     {presentation.contactRegion&&<span><MapPin size={16}/>{presentation.contactRegion}</span>}
     {tenant.contactEmail&&<a href={"mailto:"+tenant.contactEmail}><Mail size={16}/>{tenant.contactEmail}</a>}
     {tenant.whatsapp&&<a href={"https://wa.me/"+tenant.whatsapp} rel="noopener noreferrer" target="_blank"><MessageCircle size={16}/> Escribir por WhatsApp</a>}
     {!tenant.whatsapp&&!tenant.contactEmail&&links.some(x=>x.id==="contacto")&&<Link href="/contacto">Enviar una consulta</Link>}
    </div>
   </div>
  </div>
  <div className="container nexus-footer-bottom"><span>© {new Date().getFullYear()} {tenant.name}. Todos los derechos reservados.</span>
   <span>{presentation.footerNotice}</span>
   <Link href="/admin">Acceso administrativo</Link>
  </div>
 </footer>;
}
