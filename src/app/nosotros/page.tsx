import Link from "next/link";
import {ArrowRight,ArrowUpRight,HeartHandshake,ShieldCheck,Compass,CheckCircle2,MessageCircle} from "lucide-react";
import {getPublicContext} from "@/lib/tenant";
import {assertPagePublished} from "@/lib/site-pages";
import {PublicFrame} from "@/components/public-frame";
import {NexusInnerMotion} from "@/components/nexus-inner-motion";
import {PageExtraSections} from "@/components/page-extra-sections";
import {getSiteTemplate} from "@/lib/site-template-store";
import {OrganizationAbout} from "@/components/templates/organization-site";
export const dynamic="force-dynamic";
export default async function About(){
 const lighter=await getPublicContext({loadProperties:false});
 const template=await getSiteTemplate(lighter.tenant.id);
 if(template.key!=="real-estate"){
  await assertPagePublished(lighter.tenant.id,lighter.demo,"nosotros");
  return <OrganizationAbout tenant={lighter.tenant} demo={lighter.demo} template={template}/>;
 }
 const {tenant,demo,settings,properties}=await getPublicContext();
 await assertPagePublished(tenant.id,demo,"nosotros");
 const image=properties.find(p=>p.image)?.image;
 return <PublicFrame tenant={tenant} demo={demo}>
  <main id="contenido" data-nexus-inner-motion="nosotros"><NexusInnerMotion/>
   <section className="nexus-inner-hero nexus-about-hero"><div className="container">
    <span className="nexus-section-kicker nexus-kicker-light">SOBRE NOSOTROS</span>
    <div className="nexus-inner-hero-row"><div><h1>Personas primero. <em>Propiedades con propósito.</em></h1>
     <p>{settings.aboutDescription}</p></div>
     <div className="nexus-inner-label">01 / NUESTRA ESENCIA</div></div>
   </div></section>
   <section className="nexus-section nexus-about-intro"><div className="container nexus-two-column">
    <div className="nexus-about-image">
     {image?<img src={image} alt="Propiedad del catálogo inmobiliario" loading="lazy"/>:<div className="nexus-abstract-architecture" aria-hidden="true"><span/><span/><span/></div>}
     <div className="nexus-about-image-caption">Un espacio nuevo. Una nueva etapa.</div>
    </div>
    <div className="nexus-about-intro-copy"><span className="nexus-section-kicker">LO QUE NOS MUEVE</span>
     <h2>{settings.aboutTitle}</h2>
     <p>{settings.aboutDescription}</p>
     <p>Sabemos que elegir dónde vivir o invertir implica considerar ubicación, necesidades y prioridades. Nuestra labor es ayudarte a explorar alternativas y dar respuesta a tus preguntas.</p>
     <Link href="/propiedades" className="nexus-text-link">Explorar propiedades disponibles <ArrowUpRight size={18}/></Link>
    </div>
   </div></section>
   <section className="nexus-section nexus-principles"><div className="container">
    <div className="nexus-section-heading"><div><span className="nexus-section-kicker">NUESTRA DIRECCIÓN</span>
     <h2>Una forma más cercana de <em>hacer inmobiliaria.</em></h2></div></div>
    <div className="nexus-principles-grid">
     <article><span className="nexus-principle-icon"><Compass size={26}/></span><small>01 · MISIÓN</small><h3>Nuestro compromiso</h3><p>{settings.aboutMission}</p></article>
     <article><span className="nexus-principle-icon"><HeartHandshake size={26}/></span><small>02 · VISIÓN</small><h3>Nuestra perspectiva</h3><p>{settings.aboutVision}</p></article>
    </div>
   </div></section>
   <section className="nexus-section nexus-values"><div className="container">
    <span className="nexus-section-kicker">ASÍ TRABAJAMOS</span><h2>Claridad en cada <em>conversación.</em></h2>
    <div className="nexus-value-list">
     <div><CheckCircle2 size={24}/><strong>Atención a tus necesidades</strong><p>Escuchamos lo que buscas para orientar mejor la selección.</p></div>
     <div><ShieldCheck size={24}/><strong>Información transparente</strong><p>Compartimos las características disponibles de cada inmueble para ayudarte a evaluar opciones.</p></div>
     <div><MessageCircle size={24}/><strong>Comunicación cercana</strong><p>Facilitamos que puedas consultar, comparar y dar seguimiento a una propiedad.</p></div>
    </div>
   </div></section>
   <section className="nexus-simple-cta"><div className="container"><div>
    <span className="nexus-section-kicker nexus-kicker-light">SIGAMOS EN CONTACTO</span>
    <h2>Conversemos sobre lo que <em>estás buscando.</em></h2></div>
    <Link href="/contacto" className="btn nexus-hero-primary">Contactar a la inmobiliaria <ArrowRight size={18}/></Link>
   </div></section>
  <PageExtraSections tenantId={tenant.id} slug="nosotros" demo={demo}/>
  </main>
 </PublicFrame>;
}
