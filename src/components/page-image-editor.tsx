import {ImageIcon} from "lucide-react";
import {hasSiteAsset,heroKindForPage} from "@/lib/site-assets";
import {SiteAssetManager} from "@/components/site-asset-manager";

/** Shared image editing, scoped to the current tenant and built-in page. */
export async function PageImageEditor({tenantId,slug,includeAbout=false}:{tenantId:string;slug:string;includeAbout?:boolean}){
 const hero=heroKindForPage(slug);
 if(!hero)return null;
 const [bannerExists,aboutExists]=await Promise.all([
  hasSiteAsset(tenantId,hero),includeAbout?hasSiteAsset(tenantId,"about-photo"):Promise.resolve(false)
 ]);
 return <section className="admin-panel site-editor-images" aria-label="Imágenes de esta página">
  <div className="site-section-heading"><ImageIcon size={20} aria-hidden="true"/><div>
   <h2>Imágenes de esta página</h2>
   <p>Sube o reemplaza las fotografías sin editar código. Cada página conserva sus propias imágenes; el diseño anterior permanece hasta que cambies una.</p>
  </div></div>
  <div className="site-image-grid">
   <div><h3>{slug==="home"?"Fotografía principal de inicio":"Imagen del encabezado"}</h3>
    <SiteAssetManager kind={hero} exists={bannerExists} canEdit/></div>
   {includeAbout&&<div><h3>Fotografía de presentación</h3>
    <SiteAssetManager kind="about-photo" exists={aboutExists} canEdit/></div>}
  </div>
 </section>;
}
