import {hasCustomPdf} from "@/lib/property-document";
import {ContactForm} from "@/components/contact-form";
import {WhatsAppButton} from "@/components/traffic-events";
import {getStandaloneModules} from "@/lib/independent-modules";
import Link from "next/link";
import {notFound} from "next/navigation";
import {ArrowLeft,MapPin,BedDouble,Bath,Maximize2,Home} from "lucide-react";
import {getStandalonePublicContext} from "@/lib/independent-public-context";
import {findStandalonePublishedProperty} from "@/lib/independent-repositories";
import {PropertyGallery} from "@/components/property-gallery";
import {formatPrice} from "@/lib/demo";
import {SiteNav} from "@/components/site-nav";
import {SiteFooter} from "@/components/site-footer";
import {getSiteMenu} from "@/lib/site-pages";
export const dynamic="force-dynamic";
export default async function StandaloneProperty({params}:{params:Promise<{slug:string}>}){
 if(process.env.NEXUS_STANDALONE!=="true")notFound();
 const [{slug},context]=await Promise.all([params,getStandalonePublicContext({loadProperties:false})]);
 if(!context)notFound();
 const record=await findStandalonePublishedProperty(slug);
 const p=record?{...record,price:Number(record.price),operation:record.operation==="alquiler"?"alquiler" as const:"venta" as const,neighborhood:record.neighborhood||"",bedrooms:record.bedrooms||0,bathrooms:record.bathrooms||0,areaM2:record.areaM2||0,photos:record.photos.map(photo=>photo.url),image:record.photos[0]?.url||""}:null;
 if(!p)notFound();
 const {tenant}=context;
 const [links,modules,customPdfAvailable]=await Promise.all([getSiteMenu("main"),getStandaloneModules("real-estate"),hasCustomPdf("main",p.id)]);
 return <div className="public-site" style={{"--red":tenant.primaryColor,"--red-dark":tenant.primaryColor} as React.CSSProperties}>
  <SiteNav tenant={tenant} links={links}/>
  <main className="container property-detail-page" id="contenido">
   <nav className="property-detail-breadcrumb" aria-label="Ubicación de página"><Link href="/propiedades"><ArrowLeft size={15}/> Volver a propiedades</Link><span>/</span><span>{p.refCode}</span></nav>
   <header className="property-detail-header"><div className="property-detail-title"><div className="property-detail-meta"><span className="property-detail-operation">{p.operation==="venta"?"En venta":"En alquiler"}</span><span>{p.type}</span><span>Ref. {p.refCode}</span></div><h1>{p.title}</h1><p><MapPin size={16}/>{p.neighborhood?p.neighborhood+", ":""}{p.city}</p></div><div className="property-detail-price"><span>Precio</span><strong>{formatPrice(p)}</strong></div></header>
   <div className="property-detail-layout"><div className="property-detail-main">
    <PropertyGallery title={p.title} photos={p.photos.length?p.photos:p.image?[p.image]:[]}/>
    <section className="property-detail-section property-detail-overview"><div className="property-detail-section-heading"><span>EL INMUEBLE</span><h2>Detalles de la propiedad</h2></div><div className="property-detail-stats">
     <div><BedDouble size={21}/><span><strong>{p.bedrooms}</strong><small>Habitaciones</small></span></div>
     <div><Bath size={21}/><span><strong>{p.bathrooms}</strong><small>Baños</small></span></div>
     <div><Maximize2 size={21}/><span><strong>{p.areaM2} m²</strong><small>Área</small></span></div>
     <div><Home size={21}/><span><strong>{p.type}</strong><small>Tipo</small></span></div>
    </div></section>
    <section className="property-detail-section"><div className="property-detail-section-heading"><span>DESCRIPCIÓN</span><h2>Acerca de esta propiedad</h2></div><p style={{whiteSpace:"pre-wrap"}}>{p.description}</p></section>
    <section className="property-detail-section property-detail-documents">
     <div className="property-detail-section-heading"><h2>Ficha técnica</h2></div>
     <a className="btn property-detail-pdf" href={`/api/propiedades/${encodeURIComponent(p.slug)}/pdf`}>Descargar ficha automática</a>
     {customPdfAvailable&&<a className="btn property-detail-pdf property-detail-pdf-outline" href={`/api/propiedades/${encodeURIComponent(p.slug)}/pdf-personalizado`}>Descargar ficha corporativa</a>}
    </section>
   </div>
    <aside className="property-detail-sidebar" aria-label="Solicitar información sobre esta propiedad">
     <div className="property-contact-card">
      <div className="property-contact-top"><h2>¿Te interesa esta propiedad?</h2><p>Consulta disponibilidad y características del inmueble.</p></div>
      <div className="property-contact-reference"><span>Referencia</span><strong>{p.refCode}</strong></div>
      {tenant.whatsapp&&<div className="property-contact-whatsapp"><WhatsAppButton tenant={tenant} property={p}/></div>}
      {modules.includes("inquiries")&&<ContactForm propertyId={p.id}/>}
     </div>
    </aside>
   </div>
  </main><SiteFooter tenant={tenant} links={links}/></div>;
}
