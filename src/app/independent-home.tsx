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
import {getSiteSettings} from "@/lib/site-settings";
import {PageExtraSections} from "@/components/page-extra-sections";
import {getPageDefinitions,getSiteMenu} from "@/lib/site-pages";
export const dynamic="force-dynamic";
export default async function StandaloneHome(){
 if(!hasDatabaseConfig()&&installerAvailable())redirect("/instalar");
 if(process.env.NEXUS_STANDALONE!=="true")notFound();
 const context=await getStandalonePublicContext();
 if(!context)notFound();
 const {tenant,properties}=context;
 const [links,hasHero,settings]=await Promise.all([getSiteMenu("main"),hasSiteAsset("main","hero"),getSiteSettings("main")]);
 const featured=settings.featuredIds.flatMap(id=>properties.filter(property=>property.id===id));
 const highlights=featured.length?featured:properties.slice(0,3);
 const catalogueVisible=links.some(link=>link.href==="/propiedades")||
  (await getPageDefinitions("main",{includeSummary:false})).some(page=>page.slug==="propiedades"&&page.published);
 return <div className="public-site" style={{"--red":tenant.primaryColor,"--red-dark":tenant.primaryColor} as React.CSSProperties}>
  <SiteNav tenant={tenant} links={links} templateKey="real-estate"/>
  <main id="contenido" className="nexus-home" data-nexus-home-motion>
   <NexusHomeMotion/>
   <section className="nexus-hero">
    <div className="nexus-hero-media" aria-hidden="true" style={{
     backgroundImage:hasHero?'url("/api/site-media/hero")':'url("https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?w=1900&q=82")'
    }}/>
    <div className="container nexus-hero-layout nexus-hero-layout-simple"><div className="nexus-hero-copy">
     <p className="nexus-eyebrow-on-dark"><span className="nexus-eyebrow-line"/> {settings.heroEyebrow}</p>
     <h1>{settings.heroHeading} <em>{settings.heroHighlight}</em></h1>
     <p className="nexus-hero-lead">{settings.heroDescription}</p>
     {catalogueVisible&&<div className="nexus-hero-actions"><Link href="/propiedades" className="btn nexus-hero-primary">{settings.heroButton} <ArrowUpRight size={18}/></Link></div>}
    </div></div>
   </section>
   {catalogueVisible&&<><section className="nexus-search-wrap" aria-label="Buscar propiedades"><div className="container">
    <div className="nexus-search-header"><strong>Encuentra tu próxima propiedad</strong><span>Explora nuestras opciones disponibles</span></div>
    <form method="get" action="/propiedades" className="nexus-search-form">
     <label>Operación<select name="operacion"><option value="">Comprar o alquilar</option><option value="venta">Comprar</option><option value="alquiler">Alquilar</option></select></label>
     <label>Tipo<select name="tipo"><option value="">Cualquier tipo</option><option value="Casa">Casa</option><option value="Apartamento">Apartamento</option><option value="Terreno">Terreno</option></select></label>
     <label>Ubicación<input name="ubicacion" placeholder="Ciudad o sector"/></label>
     <button type="submit" className="btn btn-red"><Search size={18}/> Buscar inmuebles</button>
    </form>
   </div></section>
   <section className="nexus-section nexus-featured"><div className="container">
    <div className="nexus-section-heading"><div><span className="nexus-section-kicker">{settings.sectionEyebrow}</span><h2>{settings.sectionHeading} <em>{settings.sectionHighlight}</em></h2><p>{settings.sectionDescription}</p></div>
     <Link href="/propiedades" className="nexus-text-link">Ver catálogo completo <ArrowUpRight size={19}/></Link></div>
    {properties.length?<div className="property-grid nexus-featured-grid">{highlights.map(p=><PropertyCard key={p.id} property={p}/>)}</div>:
     <div className="nexus-empty-listing"><Building2 size={32}/><h3>Próximamente, nuevas oportunidades</h3><p>Estamos preparando nuestro catálogo inmobiliario.</p></div>}
   </div></section></>}
   <PageExtraSections slug="home"/>
  </main>
  <SiteFooter tenant={tenant} links={links} templateKey="real-estate"/>
 </div>;
}
