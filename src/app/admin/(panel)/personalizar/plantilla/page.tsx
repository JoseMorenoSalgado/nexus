import Link from "next/link";
import {ArrowUpRight,Building2,House,Images,Palette} from "lucide-react";
import {requireRole} from "@/lib/auth";
import {SiteCustomizerNav} from "@/components/site-customizer-nav";
import {getSiteSettings} from "@/lib/site-settings";
export const dynamic="force-dynamic";
/** NEXUS is real estate only: do not expose switching into other business sectors. */
export default async function TemplateSettings(){
 const user=await requireRole(["admin","editor"]);
 const settings=await getSiteSettings(user.tenantId);
 return <>
  <div className="admin-heading"><div>
   <h1>Diseño inmobiliario</h1>
   <p>NEXUS utiliza exclusivamente un diseño inmobiliario. Personaliza la portada, los inmuebles, las imágenes y la identidad visual sin cambiar de sector.</p>
  </div><Link className="btn wizard-back" href="/" target="_blank" rel="noopener noreferrer">Ver sitio <ArrowUpRight size={17}/></Link></div>
  <SiteCustomizerNav current="template"/>
  <section className="admin-panel">
   <div className="editor-panel-heading"><Building2 size={22}/><h2>Plantilla inmobiliaria activa</h2></div>
   <p>Esta instalación está dedicada a la compra, venta y alquiler de propiedades. Incluye CRM, agentes, agenda, comisiones y la página opcional de asesoría empresarial.</p>
   <p className="property-help">Título de portada actual: <strong>{settings.heroHeading}</strong></p>
   <div className="dashboard-simple-list">
    <Link href="/admin/personalizar/paginas/home"><span><strong><House size={17}/> Portada inmobiliaria</strong><small>Editar textos, presentación y llamadas a la acción</small></span><ArrowUpRight size={16}/></Link>
    <Link href="/admin/propiedades"><span><strong><Building2 size={17}/> Catálogo de propiedades</strong><small>Publicar inmuebles, fotografías y fichas PDF</small></span><ArrowUpRight size={16}/></Link>
    <Link href="/admin/personalizar/medios"><span><strong><Images size={17}/> Imágenes y recursos</strong><small>Gestionar fotografías y elementos visuales</small></span><ArrowUpRight size={16}/></Link>
    <Link href="/admin/personalizar/identidad"><span><strong><Palette size={17}/> Identidad de marca</strong><small>Configurar logotipo, colores y datos de contacto</small></span><ArrowUpRight size={16}/></Link>
   </div>
  </section>
 </>;
}
