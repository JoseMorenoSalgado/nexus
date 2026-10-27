import Link from "next/link";
import {ArrowLeft,ArrowUpRight,Mail,MapPin,MessageCircle,Clock3,ShieldCheck} from "lucide-react";
import {getPublicContext} from "@/lib/tenant";
import {assertPagePublished} from "@/lib/site-pages";
import {PublicFrame} from "@/components/public-frame";
import {NexusInnerMotion} from "@/components/nexus-inner-motion";
import {PageExtraSections} from "@/components/page-extra-sections";
import {getSiteTemplate} from "@/lib/site-template-store";
import {OrganizationContact} from "@/components/templates/organization-site";
import {ContactForm} from "@/components/contact-form";
import {tenantModuleEnabled} from "@/lib/tenant-modules";
export const dynamic="force-dynamic";
export default async function Contact(){
 const lighter=await getPublicContext({loadProperties:false});
 const template=await getSiteTemplate(lighter.tenant.id);
 if(template.key!=="real-estate"){
  await assertPagePublished(lighter.tenant.id,lighter.demo,"contacto");
  return <OrganizationContact tenant={lighter.tenant} demo={lighter.demo} template={template}/>;
 }
 const {tenant,settings,demo}=await getPublicContext();
 await assertPagePublished(tenant.id,demo,"contacto");
 const inquiriesEnabled=await tenantModuleEnabled(tenant.id,"inquiries");
 const wa=tenant.whatsapp?"https://wa.me/"+tenant.whatsapp+"?text="+encodeURIComponent("Hola, deseo información sobre sus propiedades disponibles."):null;
 return <PublicFrame tenant={tenant} demo={demo}>
  <main id="contenido" data-nexus-inner-motion="contacto"><NexusInnerMotion/>
   <section className="nexus-inner-hero nexus-contact-hero"><div className="container">
    <span className="nexus-section-kicker nexus-kicker-light">CONTACTO</span>
    <div className="nexus-inner-hero-row"><div><h1>{settings.contactHeading} <em>{settings.contactHighlight}</em></h1><p>{settings.contactDescription}</p></div>
     <div className="nexus-inner-label">03 / CONVERSEMOS</div></div>
   </div></section>
   <section className="nexus-section nexus-contact-page"><div className="container nexus-contact-page-grid">
    <div className="nexus-contact-information">
     <span className="nexus-section-kicker">¿CÓMO PODEMOS AYUDARTE?</span>
     <h2>Estamos a un <em>mensaje de distancia.</em></h2>
     <p>Escríbenos si deseas conocer detalles de una propiedad, preguntar por disponibilidad o recibir información sobre las opciones publicadas.</p>
     <div className="nexus-contact-methods">
      {wa&&<a href={wa} target="_blank" rel="noopener noreferrer" className="nexus-contact-method">
       <span><MessageCircle size={23}/></span><div><small>WHATSAPP</small><strong>Escríbenos directamente</strong><em>Atención por mensaje</em></div><ArrowUpRight size={18}/>
      </a>}
      {tenant.contactEmail&&<a href={"mailto:"+tenant.contactEmail} className="nexus-contact-method">
       <span><Mail size={23}/></span><div><small>CORREO ELECTRÓNICO</small><strong>{tenant.contactEmail}</strong><em>Envía tu consulta</em></div><ArrowUpRight size={18}/>
      </a>}
      <div className="nexus-contact-method"><span><MapPin size={23}/></span><div><small>UBICACIÓN</small><strong>Nicaragua</strong><em>Atención inmobiliaria</em></div></div>
     </div>
     <div className="nexus-contact-note"><ShieldCheck size={20}/><p>Tus datos se utilizarán para responder la consulta que envíes. Solo registra información necesaria para el contacto.</p></div>
    </div>
    <div className="nexus-contact-form-card">
     <span className="nexus-section-kicker">SOLICITAR INFORMACIÓN</span><h2>Cuéntanos qué estás buscando.</h2>
     <p>Completa el formulario y envíanos tu consulta.</p>
     {demo?<p className="preview-form-note">El formulario estará disponible cuando el sitio esté configurado.</p>:inquiriesEnabled?<ContactForm/>:<p className="property-help">El formulario de consultas está desactivado. Puedes contactarnos mediante WhatsApp o correo electrónico.</p>}
     {(await tenantModuleEnabled(tenant.id,"properties"))&&<Link href="/propiedades" className="nexus-back-link"><ArrowLeft size={15}/> Ver inmuebles disponibles</Link>}
    </div>
   </div></section>
  <PageExtraSections tenantId={tenant.id} slug="contacto" demo={demo}/>
  </main>
 </PublicFrame>;
}
