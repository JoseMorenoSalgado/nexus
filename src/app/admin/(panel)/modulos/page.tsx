import "./modules.css";
import Link from "next/link";
import {Settings2} from "lucide-react";
import {ModuleSettingsForm} from "@/components/module-settings-form";
import {requireRole} from "@/lib/auth";
import {getSiteTemplate} from "@/lib/site-template-store";
import {getTenantModules} from "@/lib/tenant-modules";
import {modulesForSector} from "@/lib/tenant-modules-registry";

export const dynamic="force-dynamic";
export default async function ModulesPage({searchParams}:{searchParams:Promise<{saved?:string;error?:string;inactive?:string}>}){
 const admin=await requireRole(["admin"]);
 const [template,params]=await Promise.all([getSiteTemplate(admin.tenantId),searchParams]);
 const enabled=await getTenantModules(admin.tenantId,template.key);
 const modules=modulesForSector(template.key);
 return <>
  <div className="admin-heading"><div><h1>Aplicaciones y módulos</h1>
   <p>Activa solo las herramientas que necesita tu empresa. Desactivar no elimina información.</p></div>
   <Link className="btn wizard-back" href="/admin/personalizar/plantilla">Cambiar sector</Link>
  </div>
  {params.saved&&<p className="property-success" role="status">Módulos guardados para esta empresa.</p>}
  {params.error&&<p className="admin-error" role="alert">No fue posible guardar los módulos. Inténtalo de nuevo.</p>}
  {params.inactive&&<p className="admin-error" role="status">Ese módulo está desactivado para tu empresa. Puedes habilitarlo aquí.</p>}
  <section className="admin-panel">
   <div className="module-heading"><Settings2 size={21}/><div><h2>Herramientas de {template.key==="real-estate"?"Inmobiliaria":template.key==="education"?"Educación":template.key==="ecommerce"?"Comercio electrónico":"Servicios"}</h2>
    <p>Elige las herramientas que necesita tu equipo. Las funciones en desarrollo se muestran aparte.</p></div></div>
   <ModuleSettingsForm modules={modules} initialEnabled={enabled}/>
  </section>
 </>;
}
