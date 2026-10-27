import {ImageIcon,Palette,Save} from "lucide-react";
import {SiteCustomizerNav} from "@/components/site-customizer-nav";
import {requireRole} from "@/lib/auth";
import {prisma} from "@/lib/prisma";
import {hasSiteAsset} from "@/lib/site-assets";
import {SiteAssetManager} from "@/components/site-asset-manager";
export const dynamic="force-dynamic";
export default async function SiteIdentity({searchParams}:{searchParams:Promise<{saved?:string;error?:string}>}){
 const admin=await requireRole(["admin","editor"]);
 const [tenant,hasHero,hasLogo,q]=await Promise.all([
  prisma.tenant.findUniqueOrThrow({where:{id:admin.tenantId},select:{tagline:true,primaryColor:true,whatsapp:true,contactEmail:true}}),
  hasSiteAsset(admin.tenantId,"hero"),hasSiteAsset(admin.tenantId,"logo"),searchParams
 ]);
 const canEdit=admin.roles.some(r=>["admin","editor"].includes(r));
 return <>
  <div className="admin-heading"><div>
   <h1>Identidad visual</h1><p>Logotipo, imagen de portada, lema y colores de tu organización.</p></div>
  </div>
  <SiteCustomizerNav current="identity"/>
  {q.saved&&<p className="property-success" role="status">Identidad visual guardada correctamente.</p>}
  {q.error&&<p className="admin-error" role="alert">No se pudieron guardar los cambios. Elige un color oscuro que contraste con texto blanco.</p>}
  <section className="admin-panel site-editor-images">
   <div className="site-section-heading"><ImageIcon size={21}/><div><h2>Logotipo e imágenes</h2>
    <p>Sube fotografías desde el celular. El servidor las optimiza en WebP y las mantiene en el volumen persistente.</p></div></div>
   <div className="site-image-grid">
    <div><h3>Banner de la portada</h3><SiteAssetManager kind="hero" exists={hasHero} canEdit={canEdit}/></div>
    <div><h3>Logotipo</h3><SiteAssetManager kind="logo" exists={hasLogo} canEdit={canEdit}/></div>
   </div>
  </section>
  <section className="admin-panel site-identity-panel">
   <div className="site-section-heading"><Palette size={21}/><div><h2>Identidad de marca</h2><p>Estos datos se aplican al sitio público sin cambiar el contenido de las demás páginas.</p></div></div>
   {canEdit?<form className="site-page-editor site-identity-form" action="/api/admin/site-section" method="post">
    <input type="hidden" name="section" value="identidad"/>
    <label>Lema institucional<input name="tagline" maxLength={110} defaultValue={tenant.tagline||""} placeholder="Pensando en tu futuro"/></label>
    <label>Color corporativo<input name="primaryColor" type="color" defaultValue={tenant.primaryColor||"#CB2027"}/></label>
    <label>WhatsApp con indicativo internacional<input name="whatsapp" type="tel" maxLength={35} defaultValue={tenant.whatsapp||""} placeholder="Ej.: +50588887777"/></label>
    <label>Correo de contacto<input name="contactEmail" type="email" maxLength={180} defaultValue={tenant.contactEmail||""} placeholder="contacto@organizacion.com"/></label>
    <div className="site-page-form-actions"><button className="btn btn-red" type="submit"><Save size={17}/> Guardar identidad visual</button></div>
   </form>:<p className="admin-error">No tienes permisos para modificar la identidad.</p>}
  </section>
 </>;
}
