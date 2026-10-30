import Link from "next/link";
import {requireAdmin} from "@/lib/auth";
import {redirect} from "next/navigation";
import {tenantLeadSources} from "@/lib/lead-sources";
export const dynamic="force-dynamic";
export default async function LeadSourceSettings({searchParams}:{searchParams:Promise<{status?:string}>}){
 const admin=await requireAdmin();
 if(!admin.roles.includes("admin"))redirect("/admin/leads");
 const sources=await tenantLeadSources(admin.tenantId);
 const {status}=await searchParams;
 return <section className="admin-panel">
  <div className="admin-heading"><div><h1>Canales de captación</h1><p>Personaliza las fuentes sin eliminar el historial de prospectos.</p></div>
   <Link className="inline-link" href="/admin/leads">Volver a prospectos</Link></div>
  {status&&<p role="status">{status==="guardado"?"Canal actualizado.":"Revisa los valores del canal."}</p>}
  <div className="user-table-wrap"><table className="admin-table"><thead><tr><th>Canal</th><th>Código</th><th>Estado</th><th>Administrar</th></tr></thead><tbody>
   {sources.map(source=><tr key={source.code}><td><form method="post" action="/api/admin/crm/sources" className="user-actions"><input type="hidden" name="intent" value="save"/><input type="hidden" name="code" value={source.code}/><input name="name" aria-label={"Nombre de "+source.code} defaultValue={source.name} maxLength={80} required/><button type="submit">Guardar nombre</button></form></td>
    <td>{source.code}</td><td>{source.active?"Activo":"Inactivo"}</td>
    <td><form method="post" action="/api/admin/crm/sources"><input name="intent" value="toggle" type="hidden"/><input name="code" value={source.code} type="hidden"/><input name="active" value={source.active?"false":"true"} type="hidden"/><button type="submit">{source.active?"Desactivar":"Activar"}</button></form></td></tr>)}
  </tbody></table></div>
  <h2>Agregar canal</h2><form className="admin-form" method="post" action="/api/admin/crm/sources">
   <input type="hidden" name="intent" value="save"/>
   <label>Código único<input name="code" pattern="[a-z][a-z0-9-]{1,30}" maxLength={32} placeholder="feria-inmobiliaria" required/></label>
   <label>Nombre visible<input name="name" maxLength={80} required placeholder="Feria inmobiliaria"/></label>
   <button className="btn btn-red" type="submit">Guardar canal</button>
  </form>
  <p className="property-help">Desactivar un canal impide seleccionarlo en nuevas consultas; no borra ni reescribe prospectos anteriores.</p>
 </section>;
}
