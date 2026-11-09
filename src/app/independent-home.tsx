import {hasSiteAsset} from "@/lib/site-assets";
import Link from "next/link";
import {notFound,redirect} from "next/navigation";
import {installerAvailable,hasDatabaseConfig} from "@/lib/server-config";
import {ArrowUpRight,Building2,Search} from "lucide-react";
import {getStandalonePublicContext} from "@/lib/independent-public-context";
import {SiteNav} from "@/components/site-nav";
import {SiteFooter} from "@/components/site-footer";
import {PropertyCard} from "@/components/property-card";
import {NexusHomeMotion} from "@/components/nexus-home-motion";
import {getSiteMenu} from "@/lib/site-pages";
export const dynamic="force-dynamic";
export default async function StandaloneHome(){
 if(!hasDatabaseConfig()&&installerAvailable())redirect("/instalar");
 if(process.env.NEXUS_STANDALONE!=="true")notFound();
 const context=await getStandalonePublicContext();
 if(!context)notFound();
 const {tenant,properties}=context;
 const [links,hasHero]=await Promise.all([getSiteMenu("main"),hasSiteAsset("main","hero")]);
 return <div className="public-site" style={{"--red":tenant.primaryColor,"--red-dark":tenant.primaryColor} as React.CSSProperties}>
  <SiteNav tenant={tenant} links={links} templateKey="real-estate"/>
  <main id="contenido" data-nexus-home-motion>
   <NexusHomeMotion/>
   <section className="nexus-hero">
    <img className="nexus-hero-media" alt="" aria-hidden="true" src={hasHero?"/api/site-media/hero":"https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?w=1900&q=82"} width={1900} height={1100}/>
    <div className="container nexus-hero-layout nexus-hero-layout-simple"><div className="nexus-hero-copy">
     <p className="nexus-eyebrow-on-dark"><span className="nexus-eyebrow-line"/> {tenant.name.toUpperCase()} · NICARAGUA</p>
     <h1>Encuentra el lugar <em>ideal para ti.</em></h1>
     <p className="nexus-hero-lead">{tenant.tagline||"Descubre oportunidades inmobiliarias en Nicaragua."}</p>
     <div className="nexus-hero-actions"><Link href="/propiedades" className="btn nexus-hero-primary">Explorar propiedades <ArrowUpRight size={18}/></Link></div>
    </div></div>
   </section>
   <section className="nexus-search-wrap" aria-label="Buscar propiedades"><div className="container">
    <div className="nexus-search-header"><strong>Encuentra tu próxima propiedad</strong><span>Explora nuestras opciones disponibles</span></div>
    <form method="get" action="/propiedades" className="nexus-search-form">
     <label>Operación<select name="operacion"><option value="">Comprar o alquilar</option><option value="venta">Comprar</option><option value="alquiler">Alquilar</option></select></label>
     <label>Tipo<select name="tipo"><option value="">Cualquier tipo</option><option value="Casa">Casa</option><option value="Apartamento">Apartamento</option><option value="Terreno">Terreno</option></select></label>
     <label>Ubicación<input name="ubicacion" placeholder="Ciudad o sector"/></label>
     <button type="submit" className="btn btn-red"><Search size={18}/> Buscar inmuebles</button>
    </form>
   </div></section>
   <section className="nexus-section nexus-featured"><div className="container">
    <div className="nexus-section-heading"><div><span className="nexus-section-kicker">OPORTUNIDADES INMOBILIARIAS</span><h2>Propiedades <em>destacadas.</em></h2><p>Explora los inmuebles disponibles.</p></div>
     <Link href="/propiedades" className="nexus-text-link">Ver catálogo completo <ArrowUpRight size={19}/></Link></div>
    {properties.length?<div className="property-grid nexus-featured-grid">{properties.slice(0,3).map(p=><PropertyCard key={p.id} property={p}/>)}</div>:
     <div className="nexus-empty-listing"><Building2 size={32}/><h3>Próximamente, nuevas oportunidades</h3><p>Estamos preparando nuestro catálogo inmobiliario.</p></div>}
   </div></section>
  </main>
  <SiteFooter tenant={tenant} links={links} templateKey="real-estate"/>
 </div>;
}
