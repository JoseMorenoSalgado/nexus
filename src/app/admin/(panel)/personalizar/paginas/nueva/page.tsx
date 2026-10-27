import Link from "next/link";
import {ArrowLeft} from "lucide-react";
import {requireRole} from "@/lib/auth";
import {CustomPageEditor} from "@/components/custom-page-editor";
export const dynamic="force-dynamic";
export default async function NewSitePage({searchParams}:{searchParams:Promise<{error?:string}>}){
 const admin=await requireRole(["admin","editor"]),q=await searchParams;
 const error=q.error==="duplicada"?"Ya existe una página con esa dirección. Prueba con otra.":q.error==="permisos"?"No tienes permiso para crear páginas.":q.error==="origen"?"La sesión o el formulario no pudieron validarse. Vuelve a abrir la página.":"Revisa el título y la dirección. Usa letras minúsculas, números o guiones.";
 return <>
  <div className="admin-heading"><div><Link href="/admin/personalizar/paginas" className="inline-link"><ArrowLeft size={16}/> Todas las páginas</Link>
   <h1>Crear página</h1><p>Crea tu contenido, revisa la vista previa y decide si publicarlo o dejarlo como borrador.</p></div></div>
  {q.error&&<p role="alert" className="admin-error">{error}</p>}
  {admin.roles.some(r=>["admin","editor"].includes(r))?<CustomPageEditor mode="create"/>:
   <p className="admin-error">No tienes permisos para crear páginas.</p>}
 </>;
}
