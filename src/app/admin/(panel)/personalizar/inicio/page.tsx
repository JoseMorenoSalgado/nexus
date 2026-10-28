import Link from "next/link";
import {ArrowUpRight,CheckCircle2,CircleAlert,FileText,Globe2,ImageIcon,ListTree,Plus} from "lucide-react";
import {requireRole} from "@/lib/auth";
import {prisma} from "@/lib/prisma";
import {getPageDefinitions,getSiteMenu} from "@/lib/site-pages";
import {hasSiteAsset} from "@/lib/site-assets";
import {SiteCustomizerNav} from "@/components/site-customizer-nav";
import "./site-hub.css";

export const dynamic="force-dynamic";

/** A single starting point for editing NEXUS, with tenant-scoped setup indicators. */
export default async function SiteHub(){
 const user=await requireRole(["admin","editor"]);
 const [pages,hasLogo,tenant]=await Promise.all([
  getPageDefinitions(user.tenantId),
  hasSiteAsset(user.tenantId,"logo"),
  prisma.tenant.findUniqueOrThrow({where:{id:user.tenantId},select:{contactEmail:true,whatsapp:true}})
 ]);
 const menu=await getSiteMenu(user.tenantId,pages);
 const totalPublished=pages.filter(page=>page.published).length;
 const hasContact=Boolean(tenant.contactEmail?.trim()||tenant.whatsapp?.trim());
 const checks=[
  {name:"Marca y contacto",ready:hasLogo&&hasContact,
   detail:!hasLogo?"Sube el logotipo corporativo; puedes añadir también WhatsApp y correo.":!hasContact?"Agrega un correo o WhatsApp de atención.":"Logotipo y canales de contacto configurados.",
   href:"/admin/personalizar/identidad",action:"Configurar identidad",Icon:ImageIcon},
  {name:"Páginas",ready:totalPublished>1,
   detail:totalPublished+" publicadas · "+(pages.length-totalPublished)+" en borrador",
   href:"/admin/personalizar/paginas",action:"Administrar páginas",Icon:FileText},
  {name:"Menú del sitio",ready:menu.length>0,
   detail:menu.length+" página"+(menu.length===1?"":"s")+" visible"+(menu.length===1?"":"s")+" en el menú",
   href:"/admin/personalizar/menu",action:"Organizar navegación",Icon:ListTree}
 ];
 const pending=checks.filter(step=>!step.ready).length;
 return <>
  <div className="admin-heading site-hub-heading"><div>
   <h1>Mi sitio web</h1>
   <p>Actualiza tu web sin entrar en configuraciones técnicas.</p>
  </div>
   <Link href="/" target="_blank" rel="noopener noreferrer" className="btn wizard-back">Ver sitio público <ArrowUpRight size={16} aria-hidden="true"/></Link>
  </div>
  <SiteCustomizerNav current="overview"/>
  <section className="admin-panel site-hub-summary" aria-labelledby="site-hub-summary-title">
   <div className="site-hub-summary-copy">
    <span className="site-hub-section-label">ADMINISTRAR TU WEB</span>
    <h2 id="site-hub-summary-title">{user.tenantName}</h2>
    <p>Edita los textos de portada, publica páginas y organiza lo que verá cada visitante.</p>
    <div className="site-hub-summary-actions">
     <Link href="/admin/personalizar/paginas/home" className="btn btn-red"><FileText size={17} aria-hidden="true"/> Editar portada</Link>
     <Link href="/admin/personalizar/paginas/nueva" className="site-hub-text-link"><Plus size={16} aria-hidden="true"/> Nueva página</Link>
    </div>
   </div>
   <div className="site-hub-status" aria-live="polite">
    <strong>{pending?pending+" apartado"+(pending===1?"":"s")+" por completar":"Configuración básica lista"}</strong>
    <span>{pending?"Completa solo lo que falta para mostrar tu negocio.":"Tu sitio está listo para seguir publicando contenido."}</span>
    <small>{totalPublished} página{totalPublished===1?"":"s"} publicada{totalPublished===1?"":"s"}</small>
   </div>
  </section>
  <section className="site-hub-section" aria-labelledby="site-hub-guide-title">
   <div className="site-hub-section-head"><div>
    <h2 id="site-hub-guide-title">Prepara tu sitio</h2>
    <p>Selecciona un apartado para editarlo. Los cambios en uno no reemplazan los demás.</p>
   </div></div>
   <div className="site-hub-checklist">
    {checks.map((step,index)=><Link href={step.href} key={step.name} className="site-hub-check">
     <span className="site-hub-check-number" aria-hidden="true">{String(index+1).padStart(2,"0")}</span>
     <step.Icon size={20} aria-hidden="true" className="site-hub-check-icon"/>
     <span className="site-hub-check-copy"><strong>{step.name}</strong><small>{step.detail}</small></span>
     <span className={"site-hub-check-state"+(step.ready?" is-ready":" is-pending")}>
      {step.ready?<CheckCircle2 size={15} aria-hidden="true"/>:<CircleAlert size={15} aria-hidden="true"/>}
      {step.ready?"Listo":"Por configurar"}
     </span>
     <span className="site-hub-check-action">{step.action} <ArrowUpRight size={14} aria-hidden="true"/></span>
    </Link>)}
   </div>
  </section>
 </>;
}
