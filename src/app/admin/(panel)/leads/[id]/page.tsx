import Link from "next/link";
import {notFound,redirect} from "next/navigation";
import {ArrowLeft,Building2,CalendarClock,Mail,MessageCircle,Phone,Save,StickyNote,CalendarPlus,HandCoins} from "lucide-react";
import {requireRole} from "@/lib/auth";
import {prisma} from "@/lib/prisma";
import {crmTablesReady} from "@/lib/crm-schema";
import {leadWhere,propertyWhere} from "@/lib/agent-scope";
import {tenantLeadSources} from "@/lib/lead-sources";
import {parseRoles} from "@/lib/roles";
import {CRM_STATUSES,crmStatusLabel,whatsappLeadUrl} from "@/lib/crm-status";
export const dynamic="force-dynamic";
type Params={error?:string;saved?:string;noteSaved?:string;created?:string;assigned?:string;unchanged?:string;propertySaved?:string;propertyUnchanged?:string};
const date=(v:Date)=>v.toLocaleDateString("es-NI",{day:"2-digit",month:"short",year:"numeric",timeZone:"UTC"});
const stamped=(v:Date)=>v.toLocaleString("es-NI",{day:"2-digit",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit",timeZone:"UTC"})+" UTC";
const errors:Record<string,string>={
 origen:"El formulario no tiene un origen válido. Recarga la página.",
 permisos:"No tienes permiso para editar este prospecto.",
 datos:"La solicitud contiene datos inválidos.",
 estado:"Selecciona un estado válido.",
 fecha:"La fecha de próximo contacto no es válida.",
 agente:"Selecciona un agente activo de esta inmobiliaria.",
 propiedad:"Solo puedes vincular propiedades que tengas autorización para gestionar.",
 nota:"La nota debe tener entre 3 y 2000 caracteres.",
 servidor:"No fue posible guardar el cambio. Revisa los registros del servidor."
};
export default async function CrmLead({params,searchParams}:{params:Promise<{id:string}>,searchParams:Promise<Params>}){
 const admin=await requireRole(["admin","editor","agente"]);
 if(!await crmTablesReady())redirect("/admin/leads");
 const {id}=await params,q=await searchParams;
 const lead=await prisma.lead.findFirst({
  where:{id,...leadWhere(admin)},
  include:{crm:true,notes:{where:{tenantId:admin.tenantId},orderBy:{createdAt:"desc"},take:50},property:{select:{refCode:true,title:true,slug:true,published:true}},assignedAgent:{select:{id:true,name:true}},assignmentHistory:{orderBy:{createdAt:"desc"},take:30},propertyHistory:{where:{tenantId:admin.tenantId},orderBy:{createdAt:"desc"},take:30}}
 });
 if(!lead)notFound();
 const sources=await tenantLeadSources(admin.tenantId);
 const sourceName=sources.find(s=>s.code===lead.source)?.name||lead.source;
 const availableProperties=await prisma.property.findMany({where:propertyWhere(admin),select:{id:true,refCode:true,title:true},orderBy:{createdAt:"desc"},take:200});
 const canEdit=admin.roles.some(r=>["admin","editor","agente"].includes(r));
 const canManageProperty=admin.roles.some(r=>["admin","editor"].includes(r));
 const team=canManageProperty?await prisma.adminUser.findMany({where:{tenantId:admin.tenantId,active:true},select:{id:true,name:true,role:true},orderBy:{name:"asc"}}):[];
 const agents=team.filter(u=>parseRoles(u.role).includes("agente"));
 const assignedUnavailable=!!lead.assignedAgentId&&!agents.some(a=>a.id===lead.assignedAgentId);
 const wa=whatsappLeadUrl(lead.phone,admin.tenantName,lead.property?.refCode);
 const url="/api/admin/crm/leads/"+encodeURIComponent(id);
 const canRecordClosing=canManageProperty&&!!lead.propertyId;
 return <>
  <div className="crm-detail-head"><Link href="/admin/leads" className="inline-link"><ArrowLeft size={16}/> Volver a prospectos</Link><span className={"crm-status crm-status-"+(lead.crm?.status||"nuevo")}>{crmStatusLabel(lead.crm?.status||"nuevo")}</span></div>
  <div className="admin-heading"><div><h1>{lead.name}</h1><p>Consulta recibida el {date(lead.createdAt)} · Origen: {sourceName}</p></div><Link className="btn wizard-back" href={"/admin/agenda?lead="+encodeURIComponent(id)}><CalendarPlus size={16}/> Programar actividad</Link></div>
  {(q.saved||q.noteSaved||q.created||q.assigned||q.unchanged||q.propertySaved||q.propertyUnchanged)&&<p className="property-success" role="status">{q.created?"Prospecto registrado correctamente.":q.assigned?"Responsable actualizado e historial registrado.":q.propertySaved?"Interés inmobiliario actualizado con historial.":q.propertyUnchanged?"La propiedad no ha cambiado.":q.unchanged?"El responsable no ha cambiado.":q.saved?"Seguimiento guardado correctamente.":"Nota registrada en el historial."}</p>}
  {q.error&&<p className="admin-error" role="alert">{errors[q.error]||errors.servidor}</p>}
  <div className="crm-detail-grid crm-detail-simplified">
   <div className="crm-detail-primary">
    <section className="admin-panel crm-info-panel"><h2>Datos del prospecto</h2>
     <div className="crm-contact-data"><span><Phone size={17}/>{lead.phone}</span>
     {lead.email&&<span><Mail size={17}/>{lead.email}</span>}
     <span><Building2 size={17}/>{lead.property?.refCode?lead.property.refCode+" · "+lead.property.title:lead.externalPropertyInterest?"Externa: "+lead.externalPropertyInterest:"Sin propiedad asignada"}</span></div>
     {lead.message&&<div className="crm-original-message"><strong>Mensaje recibido</strong><p>{lead.message}</p></div>}
     <div className="crm-contact-actions">
      {wa&&<a href={wa} target="_blank" rel="noopener noreferrer" className="btn crm-whatsapp-btn"><MessageCircle size={18}/> Abrir WhatsApp</a>}
      {lead.email&&<a className="btn wizard-back" href={"mailto:"+lead.email}><Mail size={17}/> Enviar correo</a>}
     </div>
     <p className="property-help">Abrir WhatsApp no equivale a confirmar que el cliente respondió. Registra el contacto realizado mediante el estado y una nota.</p>
    </section>
    <section className="admin-panel crm-notes-panel">
     <h2>Propiedad de interés</h2>
     {canEdit&&<form method="post" action={url} className="crm-note-form">
      <input type="hidden" name="intent" value="property"/>
      <label>Seleccionar inmueble del inventario
       <select name="propertyId" defaultValue={lead.propertyId||""}>
        <option value="">Sin propiedad asignada</option>
        {lead.propertyId&&!availableProperties.some(p=>p.id===lead.propertyId)&&<option value={lead.propertyId} disabled>Propiedad anterior (no disponible para edición)</option>}
        {availableProperties.map(p=><option key={p.id} value={p.id}>{p.refCode} · {p.title}</option>)}
       </select>
      </label>
      <label>Interés en inmueble externo (dejar vacío al vincular inventario)
       <textarea name="externalPropertyInterest" maxLength={300} defaultValue={lead.externalPropertyInterest||""} placeholder="Describe la propiedad solicitada fuera del inventario"/>
      </label>
      <button className="btn btn-red" type="submit">Actualizar propiedad</button>
     </form>}
     <details className="crm-secondary-disclosure"><summary>Historial de propiedades ({lead.propertyHistory.length})</summary>
      {lead.propertyHistory.length?<ol className="crm-assignment-history">{lead.propertyHistory.map(h=><li key={h.id}>
       <strong>{h.fromRef||"Sin asignar"} → {h.toRef||h.externalDescription||"Sin asignar"}</strong>
       <small>{stamped(h.createdAt)} · {h.changedByName}</small>
      </li>)}</ol>:<p className="property-help">No se han modificado las propiedades de interés.</p>}
     </details>
    </section>
    <section className="admin-panel crm-notes-panel">
     <div className="editor-panel-heading"><StickyNote size={18} aria-hidden="true"/><h2>Registrar una gestión</h2></div>
     {canEdit&&<form method="post" action={url} className="crm-note-form"><input type="hidden" name="intent" value="note"/>
      <label>Nota de seguimiento<textarea name="body" placeholder="Ej.: Llamé al cliente. Desea visitar la propiedad el viernes." minLength={3} maxLength={2000} required/></label>
      <button className="btn btn-red" type="submit">Guardar nota</button>
     </form>}
     <details className="crm-secondary-disclosure crm-notes-history">
      <summary><strong>Historial de notas ({lead.notes.length})</strong><span className="editor-chevron" aria-hidden="true">⌄</span></summary>
      <div className="crm-note-list">{lead.notes.length?lead.notes.map(n=><article className="crm-note" key={n.id}>
       <div><strong>{n.authorName}</strong><time dateTime={n.createdAt.toISOString()}>{date(n.createdAt)}</time></div>
       <p>{n.body}</p>
      </article>):<p className="property-help">Todavía no hay notas de seguimiento.</p>}</div>
     </details>
    </section>
   </div>
   <aside className="admin-panel crm-followup-panel">
    <div className="editor-panel-heading"><CalendarClock size={19} aria-hidden="true"/><h2>Próxima acción</h2></div>
    <p className="crm-followup-intro">Actualiza el estado y define cuándo contactar nuevamente.</p>
    <p className="crm-owner-label"><strong>Responsable:</strong> {lead.assignedAgent?.name||"Sin agente asignado"}</p>
    {canEdit?<form method="post" action={url} className="crm-followup-form">
     <input type="hidden" name="intent" value="status"/>
     <label>Estado comercial<select name="status" defaultValue={lead.crm?.status||"nuevo"}>
      {CRM_STATUSES.map(s=><option key={s.value} value={s.value}>{s.label}</option>)}
     </select></label>
     <label>Próximo contacto<input name="nextContactAt" type="date" defaultValue={lead.crm?.nextContactAt?.toISOString().slice(0,10)||""}/></label>
     <button className="btn btn-red" type="submit"><Save size={17}/> Guardar seguimiento</button>
    </form>:<div className="crm-contact-data"><strong>{crmStatusLabel(lead.crm?.status||"nuevo")}</strong>{lead.crm?.nextContactAt&&<span>Próximo contacto: {date(lead.crm.nextContactAt)}</span>}</div>}
    {canManageProperty&&<details className="crm-secondary-disclosure crm-agent-assignment">
     <summary><strong>Responsable e historial</strong><span className="editor-chevron" aria-hidden="true">⌄</span></summary>
     <div className="crm-agent-assignment-content">
      <p className="property-help">El agente asignado conserva el prospecto aunque cambie el responsable del inmueble.</p>
      <form method="post" action={url}>
       <input name="intent" type="hidden" value="assign"/>
       <label>Agente comercial
        <select name="assignedAgentId" defaultValue={lead.assignedAgentId||""}>
         <option value="">Sin asignar</option>
         {assignedUnavailable&&<option value={lead.assignedAgentId||""} disabled>Responsable anterior: {lead.assignedAgent?.name||"Cuenta no disponible"}</option>}
         {agents.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
       </label>
       <button className="btn wizard-back" type="submit">Guardar responsable</button>
      </form>
      <details className="crm-secondary-disclosure crm-assignment-history-section">
       <summary><strong>Historial de asignaciones ({lead.assignmentHistory.length})</strong><span className="editor-chevron" aria-hidden="true">⌄</span></summary>
       {lead.assignmentHistory.length?<ol className="crm-assignment-history">
        {lead.assignmentHistory.map(h=><li key={h.id}><strong>{h.fromAgentName||"Sin asignar"} → {h.toAgentName||"Sin asignar"}</strong><small>{stamped(h.createdAt)} · {h.changedByName}</small></li>)}
       </ol>:<p className="property-help">No hay reasignaciones registradas.</p>}
      </details>
     </div>
    </details>}
    {canRecordClosing&&<Link className="crm-secondary-link" href={"/admin/cierres?lead="+encodeURIComponent(id)}><HandCoins size={16}/> Registrar venta o alquiler</Link>}
    {lead.property&&canManageProperty&&<Link className="inline-link" href={"/admin/propiedades/"+encodeURIComponent(lead.propertyId||"")+"/editar"}>Gestionar inmueble →</Link>}
    {lead.property?.published&&!canManageProperty&&<Link className="inline-link" target="_blank" href={"/propiedades/"+encodeURIComponent(lead.property.slug)}>Ver propiedad pública →</Link>}
   </aside>
  </div>
 </>;
}
