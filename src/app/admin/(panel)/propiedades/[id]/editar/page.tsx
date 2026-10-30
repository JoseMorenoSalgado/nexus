import {stat} from "node:fs/promises";
import {mediaFilePath,mediaVariantPath} from "@/lib/property-media";
import Link from "next/link";
import {notFound} from "next/navigation";
import {ExternalLink,Save,Trash2,Users,UserPlus,Images} from "lucide-react";
import {requireRole} from "@/lib/auth";
import {prisma} from "@/lib/prisma";
import {parseRoles} from "@/lib/roles";
import {propertyWhere} from "@/lib/agent-scope";
import {AdminPropertyFields} from "@/components/admin-property-fields";
import {PropertyPhotoUploader} from "@/components/property-photo-uploader";
import {PropertyDocumentManager} from "@/components/property-document-manager";
import {hasCustomPdf} from "@/lib/property-document";
export const dynamic="force-dynamic";
const errors:Record<string,string>={
 datos:"Revisa los campos del formulario y vuelve a guardar.",
 precio:"El precio no es válido.",
 duplicado:"Ya existe una propiedad con la misma referencia.",
 origen:"No se pudo verificar el origen del formulario.",
 confirmacion:"Para eliminar el inmueble debes confirmar su referencia. Solo un administrador puede hacerlo.",
 servidor:"No fue posible guardar los cambios. Revisa los registros de Plesk."
};
export default async function EditProperty({params,searchParams}:{params:Promise<{id:string}>;searchParams:Promise<{error?:string;created?:string;saved?:string}>}){
 const admin=await requireRole(["admin","editor","agente"]);
 const {id}=await params;
 const q=await searchParams;
 const property=await prisma.property.findFirst({where:{id,...propertyWhere(admin)},include:{photos:{orderBy:{sortOrder:"asc"}}}});
 if(!property)notFound();
 const photoSizes=Object.fromEntries(await Promise.all(property.photos.map(async photo=>{
  const paths=[mediaFilePath(admin.tenantId,photo.id),mediaVariantPath(admin.tenantId,photo.id,"card"),mediaVariantPath(admin.tenantId,photo.id,"thumb")];
  const sizes=await Promise.all(paths.map(path=>stat(path).then(file=>file.size).catch(()=>null)));
  return [photo.id,{full:sizes[0],card:sizes[1],thumb:sizes[2]}] as const;
 })));
 const canEdit=admin.roles.some(r=>["admin","editor","agente"].includes(r));
 const hasDocument=await hasCustomPdf(admin.tenantId,property.id);
 const users=await prisma.adminUser.findMany({where:{tenantId:admin.tenantId,active:true},select:{id:true,name:true,email:true,role:true}});
 const agents=users.filter(u=>parseRoles(u.role).includes("agente"));
 return <>
  <div className="admin-heading"><div><h1>Editar propiedad</h1><p>Referencia {property.refCode} · {property.published?"Publicada":"Borrador"}</p></div><div className="admin-context-actions"><Link href={"/admin/leads?q="+encodeURIComponent(property.refCode)} className="inline-link"><Users size={16}/> Ver prospectos</Link><Link href={"/admin/leads/nuevo?propertyId="+encodeURIComponent(property.id)} className="inline-link"><UserPlus size={16}/> Registrar interesado</Link><Link href="/admin/propiedades" className="inline-link">← Propiedades</Link></div></div>
  {q.created&&<p className="property-success" role="status">Propiedad creada correctamente. Ahora puedes añadir fotografías.</p>}
  {q.saved&&<p className="property-success" role="status">Cambios guardados correctamente.</p>}
  {q.error&&<p className="admin-error" role="alert">{errors[q.error]||errors.servidor}</p>}
  <nav className="editor-quick-nav" aria-label="Ir a una sección de la propiedad"><a href="#editar-datos">Datos principales</a><a href="#editar-fotos">Fotografías ({property.photos.length})</a><a href="#editar-pdf">Ficha PDF</a></nav>
  {canEdit&&<form id="editar-datos" action={"/api/admin/properties/"+encodeURIComponent(id)} method="post" className="admin-form property-editor">
   <input type="hidden" name="intent" value="save"/>
   <AdminPropertyFields property={{...property,price:Number(property.price)}} agents={agents} allowAssignment={admin.roles.some(r=>r==="admin"||r==="editor")}/>
   <div className="property-editor-actions">
    <button type="submit" className="btn btn-red"><Save size={17}/> Guardar cambios</button>
    {property.published&&<Link className="btn wizard-back" href={"/propiedades/"+encodeURIComponent(property.slug)} target="_blank">Ver publicada <ExternalLink size={15}/></Link>}
   </div>
  </form>}
  <section id="editar-fotos" className="admin-panel property-photo-panel editor-media-panel"><div className="editor-panel-heading"><Images size={19}/><h2>Fotografías ({property.photos.length})</h2></div><p>Sube imágenes JPG, PNG o WebP (máximo 8 MB cada una, hasta 15). Se convierten a WebP y se eliminan los metadatos de ubicación.</p>
   {canEdit?<PropertyPhotoUploader propertyId={id} sizes={photoSizes} photos={property.photos.map(x=>({id:x.id,url:x.url,alt:x.alt||property.title}))}/>:<p>Solo disponible para administradores y editores.</p>}
  </section>
  <details id="editar-pdf" className="admin-panel property-photo-panel editor-disclosure editor-pdf-disclosure"><summary><span><strong>Ficha técnica en PDF</strong><small>Descargar ficha o gestionar un PDF corporativo</small></span><span className="editor-chevron" aria-hidden="true">⌄</span></summary><div className="editor-disclosure-body">
   <p className="property-help">La ficha se genera automáticamente con los datos del inmueble o puedes subir una versión personalizada de tu empresa.</p>
   <div className="property-pdf-auto">
    <div><strong>Ficha automática optimizada</strong><span>Resumen de una página o ficha ampliada de máximo dos páginas.</span></div>
   </div>
   {property.published?<form action={"/api/propiedades/"+encodeURIComponent(property.slug)+"/pdf"} method="get" target="_blank" className="admin-form" aria-label="Exportar ficha técnica">
     <label>Formato de exportación<select name="formato" defaultValue="ampliada"><option value="resumida">Resumida — 1 página</option><option value="ampliada">Ampliada — máximo 2 páginas</option></select></label>
     <fieldset><legend>Seleccionar fotografías destacadas (máximo 5)</legend>
      {property.photos.slice(0,8).map((photo,i)=><label key={photo.id} className="property-check"><input name="fotos" type="checkbox" value={photo.id} defaultChecked={i<5}/>{photo.alt||"Fotografía "+(i+1)}</label>)}
     </fieldset>
     <p className="property-help">Las imágenes restantes se consultan en la galería de la página pública. Puedes ordenar la galería en la sección de fotografías.</p>
     <div className="property-editor-actions"><button type="submit" name="vista" value="1" className="btn wizard-back">Previsualizar PDF</button><button type="submit" name="vista" value="0" className="btn btn-red">Descargar PDF</button></div>
    </form>:<p className="property-help">Publica el inmueble para previsualizar o descargar la ficha automática.</p>}
   <PropertyDocumentManager propertyId={id} hasDocument={hasDocument} canEdit={canEdit}/>
  </div></details>
  {admin.roles.includes("admin")&&<details className="property-danger"><summary><Trash2 size={16}/> Eliminar inmueble</summary>
   <p>La eliminación es permanente. Las consultas de prospectos existentes se conservarán, pero dejarán de estar asociadas a este inmueble.</p>
   <form method="post" action={"/api/admin/properties/"+encodeURIComponent(id)}>
    <input type="hidden" name="intent" value="delete"/>
    <label>Escribe <strong>{property.refCode}</strong> para confirmar<input name="confirmation" required autoComplete="off" placeholder={property.refCode}/></label>
    <button type="submit" className="btn btn-danger">Eliminar permanentemente</button>
   </form>
  </details>}
 </>;
}
