import Link from "next/link";
import {ArrowLeft,ArrowUpRight,MapPin,BedDouble,Bath,Maximize2,Download,FileText,Home,MessageCircle,ShieldCheck,Check} from "lucide-react";
import {getPublicContext} from "@/lib/tenant";
import {prisma} from "@/lib/prisma";
import type {PublicProperty} from "@/lib/demo";
import {getSiteTemplate} from "@/lib/site-template-store";
import {tenantModuleEnabled} from "@/lib/tenant-modules";
import {notFound} from "next/navigation";
import {assertPagePublished} from "@/lib/site-pages";
import {formatPrice} from "@/lib/demo";
import {PublicFrame} from "@/components/public-frame";
import {NexusInnerMotion} from "@/components/nexus-inner-motion";
import {ContactForm} from "@/components/contact-form";
import {PropertyGallery} from "@/components/property-gallery";
import {hasCustomPdf} from "@/lib/property-document";
import {WhatsAppButton} from "@/components/traffic-events";

export const dynamic="force-dynamic";

export default async function Detail({params}:{params:Promise<{slug:string}>}){
 const {slug}=await params;
 const {tenant,properties:demoProperties,demo}=await getPublicContext({loadProperties:false});
 if((await getSiteTemplate(tenant.id)).key!=="real-estate"||!await tenantModuleEnabled(tenant.id,"properties"))notFound();
 await assertPagePublished(tenant.id,demo,"propiedades");
 const p:PublicProperty|undefined=demo?demoProperties.find(x=>x.slug===slug):await (async()=>{
  const row=await prisma.property.findUnique({
   where:{tenantId_slug:{tenantId:tenant.id,slug}},
   select:{id:true,slug:true,refCode:true,title:true,description:true,city:true,neighborhood:true,type:true,operation:true,price:true,bedrooms:true,bathrooms:true,areaM2:true,published:true,photos:{orderBy:{sortOrder:"asc"},select:{url:true}}}
  });
  if(!row?.published)return undefined;
  const photos=row.photos.map(photo=>photo.url);
  return {id:row.id,slug:row.slug,refCode:row.refCode,title:row.title,description:row.description,city:row.city,neighborhood:row.neighborhood||"",type:row.type,operation:row.operation==="alquiler"?"alquiler" as const:"venta" as const,price:Number(row.price),bedrooms:row.bedrooms||0,bathrooms:row.bathrooms||0,areaM2:row.areaM2||0,image:photos[0]||"",photos};
 })();
 if(!p)notFound();
 const customPdfAvailable=!demo&&await hasCustomPdf(tenant.id,p.id);
 return <PublicFrame tenant={tenant} demo={demo} property={p}>
  <main className="container property-detail-page" id="contenido" data-nexus-inner-motion="detalle"><NexusInnerMotion/>
   <nav className="property-detail-breadcrumb" aria-label="Ubicación de página">
    <Link href="/propiedades"><ArrowLeft size={15}/> Volver a propiedades</Link>
    <span aria-hidden="true">/</span><span>{p.refCode}</span>
   </nav>
   <header className="property-detail-header">
    <div className="property-detail-title">
     <div className="property-detail-meta">
      <span className="property-detail-operation">{p.operation==="venta"?"En venta":"En alquiler"}</span>
      <span>{p.type}</span><span>Ref. {p.refCode}</span>
     </div>
     <h1>{p.title}</h1>
     <p><MapPin size={16}/>{p.neighborhood}, {p.city}</p>
    </div>
    <div className="property-detail-price">
     <span>Precio {p.operation==="venta"?"de venta":"de alquiler"}</span>
     <strong>{formatPrice(p)}</strong>
    </div>
   </header>
   {demo&&<p className="demo-note">Ficha ilustrativa: datos y precios de demostración.</p>}
   <div className="property-detail-layout">
    <div className="property-detail-main">
     <PropertyGallery title={p.title} photos={p.photos.length?p.photos:p.image?[p.image]:[]}/>
     <section className="property-detail-section property-detail-overview">
      <div className="property-detail-section-heading"><span>EL INMUEBLE</span><h2>Detalles de la propiedad</h2></div>
      <div className="property-detail-stats">
       <div><BedDouble size={21}/><span><strong>{p.bedrooms}</strong><small>Habitaciones</small></span></div>
       <div><Bath size={21}/><span><strong>{p.bathrooms}</strong><small>Baños</small></span></div>
       <div><Maximize2 size={21}/><span><strong>{p.areaM2} m²</strong><small>Área</small></span></div>
       <div><Home size={21}/><span><strong>{p.type}</strong><small>Tipo</small></span></div>
      </div>
     </section>
     <section className="property-detail-section property-detail-description">
      <div className="property-detail-section-heading"><span>CONOCE EL ESPACIO</span><h2>Descripción</h2></div>
      <p>{p.description}</p>
     </section>
     <section className="property-detail-section property-detail-documents">
      <div className="property-detail-section-heading"><span>INFORMACIÓN PARA COMPARTIR</span><h2>Ficha técnica y documentos</h2></div>
      <p>Descarga una ficha con los datos y fotografías disponibles de esta propiedad.</p>
      <div className="property-detail-document-actions">
       <a href={`/api/propiedades/${p.slug}/pdf`} className="btn property-detail-pdf"><FileText size={18}/> Descargar ficha automática <Download size={16}/></a>
       {customPdfAvailable&&<a href={`/api/propiedades/${p.slug}/pdf-personalizado`} className="btn property-detail-pdf property-detail-pdf-outline"><FileText size={18}/> Descargar ficha corporativa <Download size={16}/></a>}
      </div>
     </section>
    </div>
    <aside className="property-detail-sidebar" aria-label="Solicitar información sobre esta propiedad">
     <div className="property-contact-card">
      <div className="property-contact-top">
       <span><MessageCircle size={17}/> ATENCIÓN PERSONALIZADA</span>
       <h2>¿Te interesa esta propiedad?</h2>
       <p>Solicita información sobre disponibilidad y características del inmueble.</p>
      </div>
      <div className="property-contact-reference"><span>Referencia</span><strong>{p.refCode}</strong></div>
      {tenant.whatsapp&&<div className="property-contact-whatsapp"><WhatsAppButton tenant={tenant} property={p}/></div>}
      <div className="property-contact-divider"><span>Déjanos tu consulta</span></div>
      {demo?<p className="preview-form-note">Esta propiedad es de demostración. El formulario se habilitará al conectar MariaDB.</p>:<ContactForm propertyId={p.id}/>}
      <p className="property-contact-privacy"><ShieldCheck size={15}/> Tus datos se utilizan para responder tu solicitud.</p>
     </div>
     <div className="property-contact-support"><Check size={16}/><span>Consulta sin compromiso</span><Link href="/contacto">Otros medios de contacto <ArrowUpRight size={15}/></Link></div>
    </aside>
   </div>
  </main>
 </PublicFrame>;
}
