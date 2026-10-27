import Link from "next/link";
import {ArrowRight,ArrowUpRight,GraduationCap,BookOpen,UsersRound,BriefcaseBusiness,Handshake,Target,Mail,MessageCircle,ShoppingBag,PackageCheck,Headphones} from "lucide-react";
import {type PublicTenant} from "@/lib/demo";
import {type SiteTemplate} from "@/lib/site-template-store";
import {PublicFrame} from "@/components/public-frame";
import {PageExtraSections} from "@/components/page-extra-sections";
import {getPageDefinitions} from "@/lib/site-pages";
import {ContactForm} from "@/components/contact-form";
import {tenantModuleEnabled} from "@/lib/tenant-modules";
type Props={tenant:PublicTenant;demo:boolean;template:SiteTemplate;heroImage?:boolean};
const icons={education:[BookOpen,GraduationCap,UsersRound],services:[BriefcaseBusiness,Target,Handshake],ecommerce:[ShoppingBag,PackageCheck,Headphones]};
function context(template:SiteTemplate){return template.key==="education"?{
 label:"Educación",servicesLabel:"Programas",aboutLabel:"Nuestra institución"
}:template.key==="ecommerce"?{
 label:"Comercio electrónico",servicesLabel:"Nuestra oferta",aboutLabel:"Nuestra tienda"
}:{label:"Servicios",servicesLabel:"Nuestros servicios",aboutLabel:"Quiénes somos"};}
export async function OrganizationHome({tenant,demo,template,heroImage}:Props){
 const pages=await getPageDefinitions(tenant.id);
 const visible=new Set(pages.filter(p=>p.published).map(p=>p.id));
 const c=context(template),data=template.content,Icons=icons[template.key==="education"?"education":template.key==="ecommerce"?"ecommerce":"services"];
 return <PublicFrame tenant={tenant} demo={demo}>
  <main id="contenido" className="organization-main">
   <section className={"organization-hero"+(heroImage?" organization-hero-image":"")}>
    <div className="container organization-hero-inner">
     <p className="organization-kicker">{data.eyebrow}</p>
     <h1>{data.headline}</h1>
     <p className="organization-hero-description">{data.description}</p>
     <div className="organization-hero-actions">
      {visible.has("servicios")&&<Link className="btn organization-primary-button" href="/servicios">{data.actionLabel} <ArrowUpRight size={18}/></Link>}
      {visible.has("contacto")&&<Link className="organization-secondary-link" href="/contacto">Solicitar información <ArrowRight size={18}/></Link>}
     </div>
    </div>
   </section>
   {visible.has("servicios")&&<section className="organization-section" aria-labelledby="organization-services-title"><div className="container">
    <div className="organization-section-heading"><div><span className="organization-section-kicker">{c.servicesLabel.toUpperCase()}</span><h2 id="organization-services-title">{c.servicesLabel}</h2></div>
     <Link href="/servicios" className="organization-text-link">Ver más <ArrowUpRight size={17}/></Link></div>
    <div className="organization-cards">{data.cards.map((item,i)=>{
     const Icon=Icons[i];return <article className="organization-card" key={i}>
      <span className="organization-card-icon"><Icon size={25}/></span>
      <h3>{item.title}</h3><p>{item.description}</p>
      <Link href="/servicios" aria-label={"Conocer "+item.title}>Más información <ArrowUpRight size={16}/></Link>
     </article>;
    })}</div>
   </div></section>}
   {visible.has("nosotros")&&<section className="organization-about-preview"><div className="container organization-about-layout">
    <div><span className="organization-section-kicker">{c.aboutLabel.toUpperCase()}</span><h2>{data.aboutTitle}</h2><p>{data.aboutText}</p>
     <Link className="organization-text-link" href="/nosotros">Conócenos <ArrowUpRight size={17}/></Link></div>
    <aside className="organization-feature-panel"><span>{tenant.name}</span><strong>{tenant.tagline||data.eyebrow}</strong></aside>
   </div></section>}
   {visible.has("contacto")&&<section className="organization-cta"><div className="container"><div><span>ESTAMOS PARA AYUDARTE</span><h2>{data.contactTitle}</h2><p>{data.contactText}</p></div>
    <Link href="/contacto" className="btn organization-primary-button">Contactar <ArrowRight size={17}/></Link>
   </div></section>}
  <PageExtraSections tenantId={tenant.id} slug="home" demo={demo}/>
  </main>
 </PublicFrame>;
}
export function OrganizationAbout({tenant,demo,template}:Props){
 const d=template.content;
 return <PublicFrame tenant={tenant} demo={demo}><main id="contenido" className="organization-main">
  <section className="organization-inner-hero"><div className="container"><span className="organization-section-kicker">NOSOTROS</span><h1>{d.aboutTitle}</h1><p>{d.aboutText}</p></div></section>
  <section className="organization-section"><div className="container organization-reading">
   <h2>{tenant.name}</h2><p>{tenant.tagline||d.description}</p>
   <Link href="/servicios" className="organization-text-link">{template.key==="education"?"Conocer programas":"Conocer servicios"} <ArrowUpRight size={17}/></Link>
  </div></section>
  <section className="organization-cta"><div className="container"><div><h2>{d.contactTitle}</h2><p>{d.contactText}</p></div><Link className="btn organization-primary-button" href="/contacto">Contáctanos <ArrowRight size={17}/></Link></div></section>
  <PageExtraSections tenantId={tenant.id} slug="nosotros" demo={demo}/>
 </main></PublicFrame>;
}
export function OrganizationServices({tenant,demo,template}:Props){
 const d=template.content,educational=template.key==="education";
 const Icons=icons[educational?"education":template.key==="ecommerce"?"ecommerce":"services"];
 return <PublicFrame tenant={tenant} demo={demo}><main id="contenido" className="organization-main">
  <section className="organization-inner-hero"><div className="container"><span className="organization-section-kicker">{educational?"PROGRAMAS EDUCATIVOS":template.key==="ecommerce"?"OFERTA COMERCIAL":"SERVICIOS PROFESIONALES"}</span>
   <h1>{educational?"Programas de formación":template.key==="ecommerce"?"Nuestra oferta":"Nuestros servicios"}</h1><p>{d.description}</p></div></section>
  <section className="organization-section"><div className="container">
   <div className="organization-cards">{d.cards.map((item,i)=>{const Icon=Icons[i];return <article className="organization-card" key={i}>
    <span className="organization-card-icon"><Icon size={25}/></span><h2>{item.title}</h2><p>{item.description}</p>
    <Link href="/contacto">Consultar <ArrowUpRight size={16}/></Link>
   </article>;})}</div>
  </div></section>
  <section className="organization-cta"><div className="container"><div><h2>{d.contactTitle}</h2><p>{d.contactText}</p></div><Link className="btn organization-primary-button" href="/contacto">Solicitar información <ArrowRight size={17}/></Link></div></section>
  <PageExtraSections tenantId={tenant.id} slug="servicios" demo={demo}/>
 </main></PublicFrame>;
}
export async function OrganizationContact({tenant,demo,template}:Props){
 const d=template.content;
 const inquiriesEnabled=await tenantModuleEnabled(tenant.id,"inquiries");
 const phone=tenant.whatsapp?.replace(/\D/g,"");
 const wa=phone?"https://wa.me/"+phone+"?text="+encodeURIComponent("Hola, deseo información sobre "+tenant.name+"."):null;
 return <PublicFrame tenant={tenant} demo={demo}><main id="contenido" className="organization-main">
  <section className="organization-inner-hero"><div className="container"><span className="organization-section-kicker">CONTACTO</span><h1>{d.contactTitle}</h1><p>{d.contactText}</p></div></section>
  <section className="organization-section"><div className="container organization-contact-layout">
   <div className="organization-contact-info"><h2>Estamos para escucharte</h2><p>Elige el canal que prefieras para comunicarte con nuestro equipo.</p>
    {wa&&<a href={wa} target="_blank" rel="noopener noreferrer"><MessageCircle size={20}/> WhatsApp <ArrowUpRight size={17}/></a>}
    {tenant.contactEmail&&<a href={"mailto:"+tenant.contactEmail}><Mail size={20}/> {tenant.contactEmail}</a>}
    {!wa&&!tenant.contactEmail&&<p>Puedes comunicarte mediante el formulario de esta página.</p>}
   </div>
   <div className="organization-contact-form"><h2>Enviar consulta</h2><p>Utilizaremos tus datos solamente para responder tu solicitud.</p>
    {demo?<p className="preview-form-note">El formulario se habilitará cuando esté configurada la base de datos.</p>:inquiriesEnabled?<ContactForm messagePlaceholder={template.key==="education"?"¿Sobre qué programa deseas información?":"¿En qué servicio estás interesado?"}/>:<p className="property-help">El formulario de consultas está desactivado. Puedes utilizar los datos de contacto disponibles.</p>}
   </div>
  </div></section>
  <PageExtraSections tenantId={tenant.id} slug="contacto" demo={demo}/>
 </main></PublicFrame>;
}
