import {Suspense} from "react";
import Link from "next/link";
import {ExternalLink,Save,Trash2,Users,UserPlus} from "lucide-react";
import {AdminPropertyFields} from "@/components/admin-property-fields";
import {loadPropertyEditor} from "@/lib/property-editor-data";
import EditorMedia from "./editor-media";

export const dynamic="force-dynamic";
const errors:Record<string,string>={
 datos:"Revisa los campos del formulario y vuelve a guardar.",
 precio:"El precio no es válido.",
 duplicado:"Ya existe una propiedad con la misma referencia.",
 origen:"No se pudo verificar el origen del formulario.",
 vinculada:"La propiedad tiene registros comerciales vinculados. Puedes despublicarla.",
 confirmacion:"Para eliminar el inmueble debes confirmar su referencia. Solo un administrador puede hacerlo.",
 servidor:"No fue posible guardar los cambios. Revisa los registros del servidor."
};

export default async function EditProperty({params,searchParams}:{
 params:Promise<{id:string}>;searchParams:Promise<{error?:string;created?:string;saved?:string}>;
}){
 const [{id},notice]=await Promise.all([params,searchParams]);
 const {property,photos,agents,canAssign,canDelete,siteId}=await loadPropertyEditor(id);
 const endpoint="/api/admin/properties/"+encodeURIComponent(property.id);
 const publicUrl="/propiedades/"+encodeURIComponent(property.slug);
 return <section className="property-editor-page" aria-labelledby="property-editor-title">
  <div className="admin-heading">
   <div>
    <h1 id="property-editor-title">Editar propiedad</h1>
    <p>Referencia {property.refCode} · {property.published?"Publicada":"Borrador"}</p>
   </div>
   <div className="admin-context-actions">
    <Link href={"/admin/leads?q="+encodeURIComponent(property.refCode)} className="inline-link"><Users size={16}/> Ver prospectos</Link>
    <Link href={"/admin/leads/nuevo?propertyId="+encodeURIComponent(property.id)} className="inline-link"><UserPlus size={16}/> Registrar interesado</Link>
    <Link href="/admin/propiedades" className="inline-link">← Propiedades</Link>
   </div>
  </div>
  {notice.created&&<p className="property-success" role="status">Propiedad creada correctamente. Ahora puedes añadir fotografías.</p>}
  {notice.saved&&<p className="property-success" role="status">Cambios guardados correctamente.</p>}
  {notice.error&&<p className="admin-error" role="alert">{errors[notice.error]||errors.servidor}</p>}
  <nav className="editor-quick-nav" aria-label="Ir a una sección de la propiedad">
   <a href="#editar-datos">Datos principales</a>
   <a href="#editar-fotos">Fotografías ({photos.length})</a>
   <a href="#editar-pdf">Ficha PDF</a>
  </nav>
  <form id="editar-datos" action={endpoint} method="post" className="admin-form property-editor">
   <input type="hidden" name="intent" value="save"/>
   <AdminPropertyFields property={property} agents={agents} allowAssignment={canAssign}/>
   <div className="property-editor-actions">
    <button type="submit" className="btn btn-red"><Save size={17}/> Guardar cambios</button>
    {property.published&&<Link className="btn wizard-back" href={publicUrl} target="_blank" rel="noopener noreferrer">Ver publicada <ExternalLink size={15}/></Link>}
   </div>
  </form>
  <Suspense fallback={<p className="admin-empty" role="status">Cargando fotografías y ficha PDF…</p>}>
   <EditorMedia property={property} photos={photos} siteId={siteId}/>
  </Suspense>
  {canDelete&&<details className="property-danger">
   <summary><Trash2 size={16}/> Eliminar inmueble</summary>
   <p>La eliminación es permanente. Las consultas de prospectos se conservan y se desvinculan del inmueble.</p>
   <form method="post" action={endpoint}>
    <input type="hidden" name="intent" value="delete"/>
    <label>Escribe <strong>{property.refCode}</strong> para confirmar<input name="confirmation" required autoComplete="off" placeholder={property.refCode}/></label>
    <button type="submit" className="btn btn-danger">Eliminar permanentemente</button>
   </form>
  </details>}
 </section>;
}
