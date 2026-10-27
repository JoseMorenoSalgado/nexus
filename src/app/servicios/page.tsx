import Link from "next/link";
import {ArrowUpRight,ArrowRight,Building2,KeyRound,Handshake,CheckCircle2,ShieldCheck} from "lucide-react";
import {getPublicContext} from "@/lib/tenant";
import {assertPagePublished} from "@/lib/site-pages";
import {getPageDefinitions} from "@/lib/site-pages";
import {PublicFrame} from "@/components/public-frame";
import {NexusInnerMotion} from "@/components/nexus-inner-motion";
import {PageExtraSections} from "@/components/page-extra-sections";
export const dynamic="force-dynamic";
const steps=[{n:"01",title:"Cuéntanos qué necesitas",text:"Indícanos el tipo de propiedad, ubicación y características que estás buscando."},
 {n:"02",title:"Explora las opciones",text:"Revisa las fichas, fotografías y detalles de las propiedades disponibles."},
 {n:"03",title:"Hablemos de los siguientes pasos",text:"Solicita información y comunícate con nuestro equipo para evaluar las alternativas."}];
export default async function Services(){
 const {tenant,settings,demo}=await getPublicContext();
 await assertPagePublished(tenant.id,demo,"servicios");
 const advisoryPublished=!demo&&(await getPageDefinitions(tenant.id)).some(p=>p.id==="asesoria-empresarial"&&p.published);
 return <PublicFrame tenant={tenant} demo={demo}>
  <main id="contenido" data-nexus-inner-motion="servicios"><NexusInnerMotion/>
   <section className="nexus-inner-hero nexus-services-hero"><div className="container">
    <span className="nexus-section-kicker nexus-kicker-light">NUESTROS SERVICIOS</span>
    <div className="nexus-inner-hero-row"><div><h1>{settings.servicesHeading}</h1><p>{settings.servicesDescription}</p></div>
     <div className="nexus-inner-label">02 / LO QUE HACEMOS</div></div>
   </div></section>
   <section className="nexus-section nexus-services-page"><div className="container">
    <div className="nexus-section-heading"><div><span className="nexus-section-kicker">TE ACOMPAÑAMOS</span>
     <h2>Encuentra la opción <em>adecuada para ti.</em></h2>
     <p>Soluciones pensadas para diferentes momentos y necesidades inmobiliarias.</p></div></div>
    <div className="nexus-service-details">
     <article id="comprar"><div className="nexus-service-icon"><Building2 size={28}/></div>
      <div><span>01 / PROPIEDADES</span><h3>Compra y venta</h3><p>{settings.servicesSale}</p>
       <ul><li><CheckCircle2 size={17}/> Fichas y fotografías de los inmuebles</li><li><CheckCircle2 size={17}/> Búsqueda por tipo, ubicación y operación</li><li><CheckCircle2 size={17}/> Consulta directa por inmueble</li></ul>
       <Link href="/propiedades?operacion=venta" className="nexus-text-link">Ver propiedades en venta <ArrowUpRight size={18}/></Link>
      </div>
     </article>
     <article id="alquilar"><div className="nexus-service-icon"><KeyRound size={28}/></div>
      <div><span>02 / ALQUILER</span><h3>Alquiler de inmuebles</h3><p>{settings.servicesRent}</p>
       <ul><li><CheckCircle2 size={17}/> Alternativas según ubicación y características</li><li><CheckCircle2 size={17}/> Información de propiedades anunciadas</li><li><CheckCircle2 size={17}/> Comunicación directa para resolver consultas</li></ul>
       <Link href="/propiedades?operacion=alquiler" className="nexus-text-link">Ver propiedades en alquiler <ArrowUpRight size={18}/></Link>
      </div>
     </article>
     <article id="asesoria"><div className="nexus-service-icon"><Handshake size={28}/></div>
      <div><span>03 / ACOMPAÑAMIENTO</span><h3>Orientación inmobiliaria</h3><p>{settings.servicesAdvice}</p>
       <ul><li><CheckCircle2 size={17}/> Atención según tu objetivo</li><li><CheckCircle2 size={17}/> Orientación sobre propiedades disponibles</li><li><CheckCircle2 size={17}/> Seguimiento de consultas</li></ul>
       <Link href="/contacto" className="nexus-text-link">Hablar con nuestro equipo <ArrowUpRight size={18}/></Link>
      </div>
     </article>
    </div>
   </div></section>
   {advisoryPublished&&<section className="nexus-advisory-services-teaser" aria-labelledby="advisory-teaser-title">
    <div className="container nexus-advisory-services-teaser-inner">
     <span className="nexus-advisory-service-teaser-icon"><ShieldCheck size={29}/></span>
     <div><span className="nexus-section-kicker">SERVICIO COMPLEMENTARIO</span>
      <h2 id="advisory-teaser-title">Asesoría empresarial y cumplimiento.</h2>
      <p>Auditoría externa, prevención LA/FT/FP y capacitación para sujetos obligados de acuerdo con su marco normativo.</p></div>
     <Link href="/asesoria-empresarial" className="btn nexus-advisory-home-button">Conoce la asesoría <ArrowUpRight size={17}/></Link>
    </div>
   </section>}
   <section className="nexus-section nexus-steps"><div className="container">
    <span className="nexus-section-kicker">UN PROCESO SENCILLO</span><h2>Así podemos <em>empezar.</em></h2>
    <div className="nexus-steps-grid">{steps.map(s=><div key={s.n}><span>{s.n}</span><h3>{s.title}</h3><p>{s.text}</p></div>)}</div>
   </div></section>
   <section className="nexus-simple-cta"><div className="container"><div><span className="nexus-section-kicker nexus-kicker-light">ESTAMOS PARA ESCUCHARTE</span>
    <h2>Una conversación puede ser <em>el primer paso.</em></h2></div>
    <Link href="/contacto" className="btn nexus-hero-primary">Solicitar información <ArrowRight size={18}/></Link>
   </div></section>
  <PageExtraSections tenantId={tenant.id} slug="servicios" demo={demo}/>
  </main>
 </PublicFrame>;
}
