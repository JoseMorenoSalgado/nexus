import Link from "next/link";
import {ArrowUpRight,Images} from "lucide-react";
import {SiteCustomizerNav} from "@/components/site-customizer-nav";
import {CmsMediaGallery} from "@/components/cms-media-gallery";
import {requireRole} from "@/lib/auth";
import {listTenantMedia,listTrashedMedia} from "@/lib/media-library";
import "./media-gallery.css";
export const dynamic="force-dynamic";
export default async function MediaLibraryPage(){
 const user=await requireRole(["admin","editor"]);
 const canManage=user.roles.includes("admin");
 const [images,trashed]=await Promise.all([
  listTenantMedia(user.tenantId),canManage?listTrashedMedia(user.tenantId):Promise.resolve([])
 ]);
 const used=images.filter(x=>x.used).length;
 const unused=images.filter(x=>x.canArchive).length;
 return <>
  <div className="admin-heading"><div><h1>Biblioteca de imágenes</h1>
   <p>Encuentra, reutiliza y organiza fotografías de tu sitio sin afectar otras páginas.</p>
  </div><Link href="/admin/personalizar/paginas" className="btn wizard-back">Editar páginas <ArrowUpRight size={16}/></Link></div>
  <SiteCustomizerNav current="media"/>
  <section className="admin-panel cms-media-overview">
   <div className="cms-media-summary"><Images size={22} aria-hidden="true"/>
    <div><h2>Imágenes de tu empresa</h2><p>Hasta 120 archivos WebP visibles por consulta.</p></div>
   </div>
   <div className="cms-media-metrics" aria-label="Estado de archivos">
    <span><strong>{images.length}</strong> imágenes</span><span><strong>{used}</strong> en uso</span>
    <span><strong>{unused}</strong> sin usar</span>
   </div>
  </section>
  <p className="cms-library-intro">Las imágenes <strong>En uso</strong> están protegidas, incluso en páginas en borrador.
   Las <strong>Recientes</strong> se protegen durante 24 horas para que puedas terminar de editarlas.
   {canManage?" Las imágenes antiguas sin usar pueden pasar a la papelera; allí se pueden restaurar.":" El administrador puede revisar las imágenes sin utilizar."}
  </p>
  <CmsMediaGallery images={images} trashed={trashed} canManage={canManage}/>
  <p className="property-help">Para cargar imágenes nuevas, abre una página y selecciona un bloque de imagen.
   Para reutilizar una fotografía utiliza <strong>Usar imagen existente</strong>. La papelera no elimina archivos automáticamente; la eliminación definitiva requiere autorización.</p>
 </>;
}
