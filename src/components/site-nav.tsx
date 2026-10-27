"use client";
import Link from "next/link";
import {usePathname} from "next/navigation";
import {type PublicTenant} from "@/lib/demo";
import {Menu,ArrowUpRight} from "lucide-react";
import {SiteBrand} from "@/components/site-brand";
import {sitePresentation} from "@/lib/site-presentation";
import {type SiteMenuItem} from "@/lib/site-pages";
import {type SiteTemplateKey} from "@/lib/site-template-registry";
export {SiteBrand as Brand} from "@/components/site-brand";
export function SiteNav({tenant,links,templateKey="real-estate"}:{tenant:PublicTenant;links:SiteMenuItem[];templateKey?:SiteTemplateKey}){
 const path=usePathname();
 const presentation=sitePresentation(tenant,templateKey);
 const items=()=>links.map(link=>{
  const selected=link.href==="/"?path==="/":path===link.href||path.startsWith(link.href+"/");
  return <Link key={link.href} href={link.href} aria-current={selected?"page":undefined}>{link.label}</Link>;
 });
 return <header className="site-header nexus-header">
  <div className="container nav-inner">
   <SiteBrand tenant={tenant} templateKey={templateKey}/>
   <nav className="nexus-nav-links" aria-label="Navegación principal">{items()}</nav>
   {links.some(x=>x.id==="contacto")&&<Link href="/contacto" className="btn btn-red nexus-header-cta">{presentation.contactAction} <ArrowUpRight size={16}/></Link>}
   <details className="mobile-menu nexus-mobile-menu">
    <summary aria-label="Abrir menú de navegación"><Menu size={24}/></summary>
    <nav aria-label="Navegación móvil">{items()}</nav>
   </details>
  </div>
 </header>;
}
