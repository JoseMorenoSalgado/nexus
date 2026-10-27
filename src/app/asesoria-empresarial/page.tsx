import type {Metadata} from "next";
import Link from "next/link";
import {notFound} from "next/navigation";
import {ArrowRight,ArrowUpRight,BookOpenCheck,CalendarCheck2,CheckCircle2,ClipboardCheck,FileSearch,GraduationCap,ShieldCheck,Scale,MessageCircle} from "lucide-react";
import {getPublicContext} from "@/lib/tenant";
import {getSiteTemplate} from "@/lib/site-template-store";
import {getPageDefinitions} from "@/lib/site-pages";
import {tenantModuleEnabled} from "@/lib/tenant-modules";
import {PublicFrame} from "@/components/public-frame";
import {PageExtraSections} from "@/components/page-extra-sections";
import {ContactForm} from "@/components/contact-form";
import {NexusInnerMotion} from "@/components/nexus-inner-motion";

export const dynamic="force-dynamic";
export const metadata:Metadata={
 title:"Asesoría Empresarial | Auditoría externa y capacitación en cumplimiento",
 description:"Información sobre auditorías externas de cumplimiento, prevención LA/FT/FP y capacitación para sujetos obligados en Nicaragua."
};

const services=[
 {title:"Auditoría externa de cumplimiento",Icon:FileSearch,
  summary:"Evaluación independiente de los controles y procedimientos de prevención aplicables a la organización.",
  details:["Revisión del sistema de prevención y su documentación.","Identificación de observaciones y oportunidades de mejora.","Informe de resultados y recomendaciones, según el alcance contratado."]},
 {title:"Asesoría en prevención LA/FT/FP",Icon:ShieldCheck,
  summary:"Orientación sobre gestión de riesgos y controles relacionados con lavado de activos y los financiamientos al terrorismo y a la proliferación.",
  details:["Diagnóstico del marco de cumplimiento aplicable.","Revisión de políticas y procedimientos internos.","Acompañamiento en planes de mejora y actualización."]},
 {title:"Capacitación para sujetos obligados",Icon:GraduationCap,
  summary:"Formación orientada al personal y responsables de cumplimiento de las entidades sujetas a las obligaciones que les correspondan.",
  details:["Conceptos y enfoque basado en riesgos.","Debida diligencia, alertas y responsabilidades generales.","Talleres adaptados al perfil y actividad de la organización."]}
];

export default async function BusinessAdvisory(){
 const {tenant,demo}=await getPublicContext({loadProperties:false});
 if((await getSiteTemplate(tenant.id)).key!=="real-estate")notFound();
 // An optional professional-service page must NEVER auto-publish for other tenants.
 const published=!demo&&(await getPageDefinitions(tenant.id)).some(p=>p.id==="asesoria-empresarial"&&p.published);
 if(!published)notFound();
 const inquiriesEnabled=await tenantModuleEnabled(tenant.id,"inquiries");
 const whatsapp=tenant.whatsapp
  ?"https://wa.me/"+tenant.whatsapp+"?text="+encodeURIComponent("Hola, deseo información sobre asesoría empresarial y capacitaciones en cumplimiento.")
  :null;
 return <PublicFrame tenant={tenant} demo={demo}>
  <main id="contenido" data-nexus-inner-motion="asesoria">
   <NexusInnerMotion/>
   <section className="nexus-inner-hero nexus-advisory-hero">
    <div className="container nexus-advisory-hero-grid">
     <div>
      <span className="nexus-section-kicker nexus-kicker-light">AUDITORÍA · PREVENCIÓN · FORMACIÓN</span>
      <h1>Asesoría empresarial para un <em>cumplimiento responsable.</em></h1>
      <p>Auditoría externa, orientación en prevención de lavado de activos y capacitación para organizaciones sujetas al marco legal aplicable en Nicaragua.</p>
      <div className="nexus-advisory-hero-actions">
       <a className="btn nexus-hero-primary" href="#solicitar-orientacion">Solicitar orientación <ArrowUpRight size={17}/></a>
       <a className="nexus-hero-secondary" href="#nuestros-servicios">Conocer los servicios <ArrowRight size={17}/></a>
      </div>
     </div>
     <div className="nexus-advisory-visual" role="img" aria-label="Diagrama informativo: identificar riesgos, revisar controles y fortalecer capacidades">
      <div className="nexus-advisory-visual-heading"><ShieldCheck size={29}/><span>PREVENCIÓN LA/FT/FP</span></div>
      <div className="nexus-advisory-visual-grid">
       <span><FileSearch size={25}/> Evaluación</span>
       <span><ClipboardCheck size={25}/> Cumplimiento</span>
       <span><GraduationCap size={25}/> Formación</span>
      </div>
      <small>Enfoque preventivo y fortalecimiento institucional</small>
     </div>
    </div>
   </section>

   <section id="nuestros-servicios" className="nexus-section nexus-advisory-services" aria-labelledby="advisory-services-heading">
    <div className="container">
     <div className="nexus-section-heading">
      <div><span className="nexus-section-kicker">SERVICIOS ESPECIALIZADOS</span>
       <h2 id="advisory-services-heading">Apoyo técnico para <em>tomar mejores decisiones.</em></h2>
       <p>El alcance de cada servicio se define de acuerdo con el sector, los riesgos, la normativa y las necesidades de la organización.</p></div>
     </div>
     <div className="nexus-advisory-service-grid">
      {services.map(({title,Icon,summary,details})=><article key={title} className="nexus-advisory-service">
       <span className="nexus-advisory-service-icon"><Icon size={27}/></span>
       <h3>{title}</h3><p>{summary}</p>
       <ul>{details.map(item=><li key={item}><CheckCircle2 size={16}/>{item}</li>)}</ul>
      </article>)}
     </div>
    </div>
   </section>

   <section className="nexus-section nexus-advisory-framework" aria-labelledby="advisory-framework-title">
    <div className="container nexus-advisory-framework-grid">
     <div>
      <span className="nexus-section-kicker">MARCO DE REFERENCIA</span>
      <h2 id="advisory-framework-title">Capacitación orientada a <em>sujetos obligados.</em></h2>
      <p>Los servicios de información y formación consideran el marco nicaragüense de prevención LA/FT/FP, en particular la <strong>Ley N.º 977</strong>, la <strong>Ley N.º 976</strong> y las reformas y disposiciones aplicables según el sujeto obligado y su supervisor.</p>
      <p>Antes de una capacitación o auditoría se delimita el régimen específico correspondiente a cada entidad. No todas las organizaciones tienen las mismas obligaciones.</p>
      <a href="https://www.uaf.gob.ni/la-uaf/base-legal" target="_blank" rel="noopener noreferrer" className="nexus-text-link">Consultar normativa oficial en la UAF <ArrowUpRight size={18}/></a>
     </div>
     <div className="nexus-advisory-process" aria-label="Etapas de trabajo">
      <div><span>01</span><div><FileSearch size={23}/><h3>Identificar</h3><p>Conocer las actividades, riesgos y necesidades de la entidad.</p></div></div>
      <div><span>02</span><div><ClipboardCheck size={23}/><h3>Revisar</h3><p>Analizar políticas, procedimientos y oportunidades de mejora.</p></div></div>
      <div><span>03</span><div><BookOpenCheck size={23}/><h3>Fortalecer</h3><p>Definir recomendaciones y desarrollar capacidades mediante formación.</p></div></div>
     </div>
    </div>
   </section>

   <section className="nexus-section nexus-advisory-resources" aria-labelledby="advisory-resources-title">
    <div className="container nexus-advisory-resources-inner">
     <div className="nexus-advisory-resources-icon"><Scale size={34}/></div>
     <div><span className="nexus-section-kicker">INFORMACIÓN Y MATERIAL DE APOYO</span>
      <h2 id="advisory-resources-title">Contenido para conocer nuestros servicios.</h2>
      <p>En esta sección se pueden incorporar infografías, fotografías de actividades formativas y explicaciones actualizadas desde el editor de páginas, respetando el material autorizado de la empresa.</p>
      <p className="nexus-advisory-resources-note">Información general; no sustituye asesoramiento legal para un caso específico ni representa una certificación de autoridad supervisora.</p>
     </div>
    </div>
   </section>
   <PageExtraSections tenantId={tenant.id} slug="asesoria-empresarial" demo={demo}/>

   <section id="solicitar-orientacion" className="nexus-section nexus-advisory-contact" aria-labelledby="advisory-contact-title">
    <div className="container nexus-advisory-contact-grid">
     <div className="nexus-advisory-contact-copy">
      <span className="nexus-section-kicker nexus-kicker-light">HABLEMOS DE TU ORGANIZACIÓN</span>
      <h2 id="advisory-contact-title">Solicita una <em>reunión de orientación.</em></h2>
      <p>Cuéntanos el tipo de entidad y el tema de interés. Nuestro equipo podrá ponerse en contacto contigo para coordinar una conversación sobre el servicio adecuado.</p>
      <p className="nexus-advisory-schedule-note"><CalendarCheck2 size={18}/> Esta es una solicitud de contacto: la fecha y hora se acuerdan posteriormente; no constituye una reserva confirmada.</p>
      {whatsapp&&<a className="nexus-advisory-whatsapp" href={whatsapp} target="_blank" rel="noopener noreferrer"><MessageCircle size={19}/> Consultar por WhatsApp <ArrowUpRight size={16}/></a>}
      {!whatsapp&&tenant.contactEmail&&<a className="nexus-advisory-whatsapp" href={"mailto:"+tenant.contactEmail}>Escribir por correo <ArrowUpRight size={16}/></a>}
      <Link href="/contacto" className="nexus-advisory-contact-general">Otros canales de contacto <ArrowRight size={17}/></Link>
     </div>
     <div className="nexus-advisory-form-card">
      <span className="nexus-section-kicker">SOLICITUD DE INFORMACIÓN</span>
      <h3>¿Cómo podemos ayudarte?</h3>
      {inquiriesEnabled?<ContactForm topic="Asesoría empresarial / solicitud de reunión" messagePlaceholder="Nombre de la organización, sector y tema de auditoría, cumplimiento o capacitación."/>:<p>La recepción de formularios está desactivada. Utiliza los canales de contacto disponibles para solicitar orientación.</p>}
      <p className="nexus-advisory-privacy"><ShieldCheck size={15}/> Compartiremos los datos únicamente para atender tu solicitud.</p>
     </div>
    </div>
   </section>
  </main>
 </PublicFrame>;
}
