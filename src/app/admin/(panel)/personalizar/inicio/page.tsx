import Link from "next/link";
import {ArrowUpRight,CheckCircle2,CircleAlert,FileText,Globe2,ImageIcon,LayoutTemplate,ListTree,Mail,Palette,Plus} from "lucide-react";
import {requireRole} from "@/lib/auth";
import {prisma} from "@/lib/prisma";
import {getPageDefinitions,getSiteMenu} from "@/lib/site-pages";
import {getSiteTemplate} from "@/lib/site-template-store";
import {hasSiteAsset} from "@/lib/site-assets";
import {SITE_TEMPLATES} from "@/lib/site-template-registry";
import {isNexusBrandName} from "@/lib/site-presentation";
import {SiteCustomizerNav} from "@/components/site-customizer-nav";
import "./site-hub.css";

export const dynamic="force-dynamic";

/** Client-first overview: all indicators are real tenant-scoped settings.
 * "Published" and "visible in navigation" are deliberately distinct.
 */
export default async function SiteHub(){
 const user=await requireRole(["admin","editor"]);
 const [template,pages,hasLogo,tenant]=await Promise.all([
  getSiteTemplate(user.tenantId),
  getPageDefinitions(user.tenantId),
  hasSiteAsset(user.tenantId,"logo"),
  prisma.tenant.findUniqueOrThrow({where:{id:user.tenantId},select:{contactEmail:true,whatsapp:true}})
 ]);
 const logoFromTheme=template.key==="real-estate"&&isNexusBrandName(user.tenantName);
 const logoReady=hasLogo||logoFromTheme;
 const menu=await getSiteMenu(user.tenantId,pages);
 const totalPublished=pages.filter(page=>page.published).length;
 const drafts=pages.filter(page=>!page.published);
 const hasContact=Boolean(tenant.contactEmail?.trim()||tenant.whatsapp?.trim());
 const templateLabel=SITE_TEMPLATES.find(entry=>entry.key===template.key)?.label||"Sitio web";
 const checks=[
  {name:"Identidad de tu marca",ready:logoReady,detail:hasLogo?"Ya tienes un logotipo cargado.":logoFromTheme?"Tu sitio utiliza el logotipo de NEXUS.":"Añade tu logotipo para identificar tu sitio.",href:"/admin/personalizar/identidad",action:logoReady?"Revisar identidad":"Agregar logotipo",Icon:ImageIcon},
  {name:"Páginas públicas",ready:totalPublished>1,detail:totalPublished+" publicadas · "+drafts.length+" en borrador",href:"/admin/personalizar/paginas",action:"Gestionar páginas",Icon:FileText},
  {name:"Menú de navegación",ready:menu.length>0,detail:menu.length+" enlace"+(menu.length===1?"":"s")+" visible"+(menu.length===1?"":"s")+" en el menú principal",href:"/admin/personalizar/menu",action:"Organizar menú",Icon:ListTree},
  {name:"Canal de contacto",ready:hasContact,detail:hasContact?"Tus visitantes pueden encontrar un canal de contacto.":"Añade un correo o WhatsApp de atención.",href:"/admin/personalizar/identidad",action:"Configurar contacto",Icon:Mail}
 ];
 const attention=checks.filter(check=>!check.ready).length;
 return <>
  <div className="admin-heading site-hub-heading"><div>
   <h1>Mi sitio web</h1>
   <p>Organiza tu sitio paso a paso. Cada herramienta modifica únicamente el apartado que elijas.</p>
  </div>
   <Link href="/" target="_blank" rel="noopener noreferrer" className="btn wizard-back">Ver sitio público <ArrowUpRight size={16} aria-hidden="true"/></Link>
  </div>
  <SiteCustomizerNav current="overview"/>
  <section className="admin-panel site-hub-summary" aria-labelledby="site-hub-summary-title">
   <div className="site-hub-summary-copy">
    <span className="site-hub-section-label">Tu espacio de trabajo</span>
    <h2 id="site-hub-summary-title">{user.tenantName}</h2>
    <p>Tipo de sitio: <strong>{templateLabel}</strong>. Las propiedades, páginas y módulos se administran por separado.</p>
    <div className="site-hub-summary-actions">
     <Link href="/admin/personalizar/paginas" className="btn btn-red"><FileText size={17} aria-hidden="true"/> Editar páginas</Link>
     <Link href="/admin/personalizar/identidad" className="site-hub-text-link"><Palette size={16} aria-hidden="true"/> Logotipo y colores</Link>
     <Link href="/admin/personalizar/plantilla" className="site-hub-text-link"><LayoutTemplate size={16} aria-hidden="true"/> Ver diseño inmobiliario</Link>
     <Link href="/admin/personalizar/medios" className="site-hub-text-link"><ImageIcon size={16} aria-hidden="true"/> Biblioteca de imágenes</Link>
    </div>
   </div>
   <div className="site-hub-status" aria-label="Estado de configuración">
    <strong>{attention?attention+" punto"+(attention===1?"":"s")+" para revisar":"Configuración básica lista"}</strong>
    <span>{attention?"Puedes completar los apartados pendientes cuando lo necesites.":"Tu sitio tiene los elementos esenciales de configuración."}</span>
    <small>{totalPublished} página{totalPublished===1?"":"s"} publicada{totalPublished===1?"":"s"}</small>
   </div>
  </section>
  <section className="site-hub-section" aria-labelledby="site-hub-guide-title">
   <div className="site-hub-section-head"><div><h2 id="site-hub-guide-title">Prepara tu sitio</h2>
    <p>Empieza por estos apartados. Los indicadores muestran la configuración real de tu empresa.</p></div>
   </div>
   <div className="site-hub-checklist">
    {checks.map((step,index)=><Link href={step.href} key={step.name} className="site-hub-check">
     <span className="site-hub-check-number" aria-hidden="true">{String(index+1).padStart(2,"0")}</span>
     <step.Icon size={20} aria-hidden="true" className="site-hub-check-icon"/>
     <span className="site-hub-check-copy"><strong>{step.name}</strong><small>{step.detail}</small></span>
     <span className={"site-hub-check-state"+(step.ready?" is-ready":" is-pending")}>
      {step.ready?<CheckCircle2 size={15} aria-hidden="true"/>:<CircleAlert size={15} aria-hidden="true"/>}
      {step.ready?"Revisado":"Por configurar"}
     </span>
     <span className="site-hub-check-action">{step.action} <ArrowUpRight size={14} aria-hidden="true"/></span>
    </Link>)}
   </div>
  </section>
  <section className="site-hub-bottom" aria-label="Publicación y páginas">
   <div className="admin-panel site-hub-small-panel">
    <div className="site-hub-small-heading"><Globe2 size={19} aria-hidden="true"/><h2>¿Cómo se publica una página?</h2></div>
    <p><strong>Publicada:</strong> cualquiera que conozca el enlace puede abrirla. Para mostrarla en el encabezado, añádela al <Link href="/admin/personalizar/menu">menú principal</Link>.</p>
    <p><strong>Borrador:</strong> no está disponible para visitantes. Puedes seguir editándola sin publicarla.</p>
    <Link className="inline-link" href="/admin/personalizar/paginas">Revisar estado de mis páginas <ArrowUpRight size={15} aria-hidden="true"/></Link>
   </div>
   <div className="admin-panel site-hub-small-panel">
    <div className="site-hub-small-heading"><FileText size={19} aria-hidden="true"/><h2>Crear contenido</h2></div>
    <p>Agrega páginas como Preguntas frecuentes, Nuestra empresa o información de tus servicios. Cada página tiene su propio borrador y editor.</p>
    <Link className="btn wizard-back" href="/admin/personalizar/paginas/nueva"><Plus size={16} aria-hidden="true"/> Nueva página</Link>
   </div>
  </section>
 </>;
}
