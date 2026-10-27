import "./preview.css";
import Link from "next/link";
import {Save,LayoutTemplate,ArrowUpRight} from "lucide-react";
import {TemplateGallery} from "@/components/template-gallery";
import {getSiteSettings} from "@/lib/site-settings";
import {prisma} from "@/lib/prisma";
import {requireRole} from "@/lib/auth";
import {SiteCustomizerNav} from "@/components/site-customizer-nav";
import {getTemplateLibrary} from "@/lib/site-template-store";
import {SITE_TEMPLATES} from "@/lib/site-template-registry";
export const dynamic="force-dynamic";
export default async function TemplateSettings({searchParams}:{searchParams:Promise<{saved?:string;error?:string}>}){
 const user=await requireRole(["admin","editor"]);
 const [{selected:key,variants},settings,listings,params]=await Promise.all([
  getTemplateLibrary(user.tenantId),
  getSiteSettings(user.tenantId),
  prisma.property.findMany({where:{tenantId:user.tenantId,published:true},select:{
   title:true,city:true,price:true,photos:{take:1,orderBy:{sortOrder:"asc"},select:{url:true}}
  },orderBy:{createdAt:"desc"},take:3}),
  searchParams
 ]);
 const content=variants[key];
 const estate={
  eyebrow:settings.heroEyebrow==="NEXUS REAL ESTATE · NICARAGUA"&&user.tenantName.trim().toLowerCase()!=="nexus real estate"
   ?"INMOBILIARIA · "+user.tenantName:settings.heroEyebrow,
  heading:settings.heroHeading,
  highlight:settings.heroHighlight,description:settings.heroDescription,
  action:settings.heroButton
 };
 const displayListings=listings.map(item=>({
  title:item.title,city:item.city,price:"$"+Number(item.price).toLocaleString("en-US"),
  imageUrl:item.photos[0]?.url||null
 }));
 return <>
  <div className="admin-heading"><div><h1>Plantilla del sitio</h1>
   <p>Elige el tipo de sitio de tu empresa. Cada organización conserva su plantilla y su contenido.</p></div>
   <Link className="btn wizard-back" href="/" target="_blank" rel="noopener noreferrer">Ver sitio <ArrowUpRight size={17}/></Link>
  </div>
  <SiteCustomizerNav current="template"/>
  {params.saved&&<p className="property-success" role="status">Configuración de plantilla guardada.</p>}
  {params.error&&<p className="admin-error" role="alert">No pudimos guardar los cambios. Verifica los campos y vuelve a intentarlo.</p>}
  <TemplateGallery current={key} variants={variants} businessName={user.tenantName}
   estate={estate} listings={displayListings}/>
  {key==="real-estate"?<section className="admin-panel template-setting-panel">
   <h2>Contenido inmobiliario</h2>
   <p>La portada y sus textos se mantienen en el editor existente; los inmuebles y fichas se gestionan desde Propiedades.</p>
   <Link className="btn wizard-back" href="/admin/personalizar/paginas/home">Editar portada inmobiliaria</Link>
  </section>:<section className="admin-panel template-setting-panel">
   <div className="editor-panel-heading"><LayoutTemplate size={20}/><h2>Contenido de {SITE_TEMPLATES.find(t=>t.key===key)?.label}</h2></div>
   <p className="property-help">Los cambios de texto afectan únicamente a esta plantilla y a esta empresa. Los datos de las otras plantillas quedan guardados.</p>
   <form method="post" action="/api/admin/site-template" className="template-content-form">
    <input type="hidden" name="intent" value="content"/><input type="hidden" name="templateKey" value={key}/>
    <fieldset><legend>Portada</legend>
     <label>Etiqueta superior<input name="eyebrow" defaultValue={content.eyebrow} maxLength={90} minLength={2} required/></label>
     <label>Título principal<input name="headline" defaultValue={content.headline} maxLength={120} minLength={2} required/></label>
     <label>Introducción<textarea name="description" defaultValue={content.description} maxLength={450} minLength={2} rows={3} required/></label>
     <label>Botón principal<input name="actionLabel" defaultValue={content.actionLabel} maxLength={55} minLength={2} required/></label>
    </fieldset>
    <fieldset><legend>Presentación institucional</legend>
     <label>Título<input name="aboutTitle" defaultValue={content.aboutTitle} maxLength={120} minLength={2} required/></label>
     <label>Descripción<textarea name="aboutText" defaultValue={content.aboutText} maxLength={1400} minLength={2} rows={4} required/></label>
    </fieldset>
    <fieldset><legend>{key==="education"?"Programas y beneficios":"Servicios destacados"}</legend>
     {content.cards.map((card,i)=><div className="template-edit-item" key={i}><strong>Bloque {i+1}</strong>
      <label>Título<input name={"cardTitle"+i} defaultValue={card.title} maxLength={90} minLength={2} required/></label>
      <label>Descripción<textarea name={"cardDescription"+i} defaultValue={card.description} maxLength={350} minLength={2} rows={2} required/></label>
     </div>)}
    </fieldset>
    <fieldset><legend>Contacto</legend>
     <label>Título<input name="contactTitle" defaultValue={content.contactTitle} maxLength={120} minLength={2} required/></label>
     <label>Introducción<textarea name="contactText" defaultValue={content.contactText} maxLength={450} minLength={2} rows={3} required/></label>
    </fieldset>
    <button type="submit" className="btn btn-red"><Save size={17}/> Guardar contenido de esta plantilla</button>
   </form>
  </section>}
  <p className="property-help">Cada plantilla tiene sus propias secciones públicas. Los formularios de contacto siguen registrándose por empresa.</p>
 </>;
}
