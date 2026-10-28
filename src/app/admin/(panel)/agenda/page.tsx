import Link from "next/link";
import {CalendarDays,CalendarClock,CheckCircle2,AlertTriangle,ArrowUpRight,PhoneCall,MapPin} from "lucide-react";
import {requireRole} from "@/lib/auth";
import {prisma} from "@/lib/prisma";
import {leadWhere,managesAllLeads} from "@/lib/agent-scope";
import {AGENDA_TYPES,AGENDA_STATUSES,agendaScope,agendaLabel,agendaStatusLabel} from "@/lib/agenda";
import {AgendaCreateForm,AgendaRescheduleForm} from "@/components/agenda-forms";
import {agendaTableReady} from "@/lib/agenda-schema";
import {AgendaCalendar,AgendaLocalDate,type AgendaView} from "@/components/agenda-calendar";
import {parseRoles} from "@/lib/roles";
import {smtpEnabled} from "@/lib/smtp-notifications";
export const dynamic="force-dynamic";

const errors:Record<string,string>={
 datos:"Revisa la fecha, el prospecto y los campos del formulario.",
 origen:"La solicitud no procede del sitio autorizado. Recarga la página.",
 permisos:"Tu usuario no tiene permisos para modificar la agenda.",
 prospecto:"El prospecto no existe o no está asignado a tu cuenta.",
 noexiste:"La actividad ya no está disponible para tu usuario.",
 servidor:"No fue posible guardar la operación. Revisa los registros del servidor.",
 activacion:"No se pudo preparar la agenda. Comprueba los permisos de la base de datos."
};
const pad=(n:number)=>String(n).padStart(2,"0");
type Search={mes?:string;vista?:string;fecha?:string;agente?:string;estado?:string;tipo?:string;lead?:string;created?:string;updated?:string;activated?:string;error?:string;mail?:string};
export default async function CommercialAgenda({searchParams}:{searchParams:Promise<Search>}){
 const user=await requireRole(["admin","editor","agente"]);
 const q=await searchParams;
 if(!await agendaTableReady())return <section className="agenda-dashboard"><div className="admin-heading"><div><h1>Agenda comercial</h1><p>Programa llamadas, visitas y reuniones relacionadas con tus prospectos.</p></div></div><div className="admin-panel"><h2>Activar agenda comercial</h2><p>La agenda necesita una tabla nueva e independiente. Se conservarán los prospectos y las propiedades existentes.</p>{q.error&&<p role="alert" className="admin-error">{errors[q.error]||errors.activacion}</p>}{user.roles.includes("admin")?<form action="/api/admin/agenda/activate" method="post"><button type="submit" className="btn btn-red">Activar agenda</button></form>:<p className="property-help">Un administrador de esta empresa debe activar la agenda antes de usarla.</p>}</div></section>;
 const emailReady=smtpEnabled();
 const now=new Date();
 const current=now.toISOString().slice(0,7);
 const month=/^\d{4}-(0[1-9]|1[0-2])$/.test(q.mes||"")?q.mes!:current;
 const [year,mm]=month.split("-").map(Number);
 // Include adjacent days to account for browser-local dates spanning a UTC month boundary.
 const from=new Date(Date.UTC(year,mm-1,1)-10*86400e3);
 const to=new Date(Date.UTC(year,mm,1)+10*86400e3);
 const view:AgendaView=q.vista==="dia"||q.vista==="semana"?q.vista:"mes";
 const date=q.fecha&&/^\d{4}-\d{2}-\d{2}$/.test(q.fecha)&&q.fecha.slice(0,7)===month&&!Number.isNaN(Date.parse(q.fecha))?q.fecha:undefined;
 const canCompare=managesAllLeads(user);
 const staff=canCompare?await prisma.adminUser.findMany({where:{tenantId:user.tenantId},
  select:{id:true,name:true,active:true,role:true},orderBy:{name:"asc"}}):[];
 const agents=staff.filter(a=>parseRoles(a.role).includes("agente"));
 const agentChoice=canCompare&&(q.agente==="none"||agents.some(a=>a.id===q.agente))?q.agente||"":"";
 const agentScope=agentChoice?{tenantId:user.tenantId,lead:{is:{...leadWhere(user),
   assignedAgentId:agentChoice==="none"?null:agentChoice}}}:agendaScope(user);
 const status=AGENDA_STATUSES.find(s=>s.value===q.estado)?.value||"";
 const type=AGENDA_TYPES.find(t=>t.value===q.tipo)?.value||"";
 const scope=agentScope;
 const [events,leads,overdue,upcoming]=await Promise.all([
  prisma.agendaEvent.findMany({where:{...scope,startsAt:{gte:from,lt:to},
   ...(status?{status}:{}),...(type?{type}:{})},orderBy:{startsAt:"asc"},take:300,
   include:{lead:{select:{id:true,name:true,property:{select:{refCode:true}},assignedAgent:{select:{name:true}}}}}}),
  prisma.lead.findMany({where:leadWhere(user),select:{id:true,name:true,property:{select:{refCode:true}},assignedAgent:{select:{name:true}}},
   orderBy:{createdAt:"desc"},take:150}),
  prisma.agendaEvent.count({where:{...scope,status:"pendiente",startsAt:{lt:now}}}),
  prisma.agendaEvent.count({where:{...scope,status:"pendiente",startsAt:{gte:now,lt:new Date(now.getTime()+7*864e5)}}})
 ]);
 const selectedLead=leads.some(l=>l.id===q.lead)?q.lead:undefined;
 const visible=events.filter(e=>{
  if(!q.lead)return true;
  return e.leadId===q.lead;
 });
 return <section className="agenda-dashboard">
  <div className="admin-heading"><div><h1>Agenda comercial</h1><p>Organiza visitas, llamadas y reuniones con seguimiento por prospecto y responsable.</p></div>

  </div>
  {(q.created||q.updated||q.activated)&&<p className="property-success" role="status">{q.activated?"Agenda activada correctamente.":q.created?"Actividad programada correctamente.":"Agenda actualizada correctamente."}</p>}
  {q.mail==="sent"&&<p className="property-success" role="status">Notificación entregada al servidor SMTP para su envío.</p>}
  {q.mail==="failed"&&<p role="alert" className="admin-error">La actividad quedó guardada, pero el envío SMTP falló. Revisa la configuración de correo en Plesk.</p>}
  {q.error&&<p className="admin-error" role="alert">{errors[q.error]||errors.servidor}</p>}
  <div className="agenda-metrics">
   <div><AlertTriangle size={19}/><span>Actividades vencidas</span><strong>{overdue}</strong><small>Pendientes con horario ya pasado</small></div>
   <div><CalendarClock size={19}/><span>Próximos 7 días</span><strong>{upcoming}</strong><small>Actividades todavía pendientes</small></div>
   <div><CalendarDays size={19}/><span>Actividades del mes</span><strong>{events.length}{events.length===300?"+":""}</strong><small>Incluye días próximos al mes elegido y respeta los filtros</small></div>
  </div>
  <details className="admin-panel agenda-create-panel" open={!!selectedLead}>
   <summary><span><CalendarDays size={20}/> Programar nueva actividad</span><span>+</span></summary>
   {leads.length?<AgendaCreateForm leads={leads.map(l=>({id:l.id,name:l.name,propertyRef:l.property?.refCode||null,agentName:l.assignedAgent?.name||null}))} defaultLeadId={selectedLead} mailEnabled={emailReady}/>:<p className="property-help">Para programar una actividad debes tener al menos un prospecto disponible. <Link href="/admin/leads/nuevo" className="inline-link">Registrar prospecto →</Link></p>}
  </details>
  {canCompare&&<form className="agenda-agent-filter" method="get" action="/admin/agenda">
   <input type="hidden" name="mes" value={month}/><input type="hidden" name="vista" value={view}/>
   {date&&<input type="hidden" name="fecha" value={date}/>}
   <label htmlFor="agenda-agent-select">Agenda del agente</label>
   <select id="agenda-agent-select" name="agente" defaultValue={agentChoice}>
    <option value="">Toda la inmobiliaria</option><option value="none">Prospectos sin agente</option>
    {agents.map(a=><option key={a.id} value={a.id}>{a.name}{!a.active?" (inactivo)":""}</option>)}
   </select>
   <button className="btn wizard-back" type="submit">Ver agenda</button>
  </form>}
  <AgendaCalendar month={month} view={view} date={date} events={visible.map(e=>({
   id:e.id,title:e.title,type:e.type,status:e.status,startsAt:e.startsAt.toISOString(),
   leadId:e.leadId,leadName:e.lead.name}))}/>
  {view==="mes"&&<section className="admin-panel">
   <div className="heading-row"><div><h2>Actividades del mes y fechas limítrofes</h2><p>Selecciona una actividad para revisar el prospecto o actualizar su estado.</p></div></div>
   <form className="agenda-list-filters" method="get" action="/admin/agenda">
    <input type="hidden" name="mes" value={month}/>
    <label>Estado<select name="estado" defaultValue={status}><option value="">Todos</option>{AGENDA_STATUSES.map(s=><option key={s.value} value={s.value}>{s.label}</option>)}</select></label>
    <label>Tipo<select name="tipo" defaultValue={type}><option value="">Todos</option>{AGENDA_TYPES.map(t=><option key={t.value} value={t.value}>{t.label}</option>)}</select></label>
    <button className="btn wizard-back">Aplicar filtros</button>
   </form>
   {!managesAllLeads(user)&&<p className="property-help">Solo se muestran actividades de prospectos actualmente asignados a tu cuenta.</p>}
   {events.length?<div className="agenda-event-list">{visible.map(e=><article className={"agenda-event agenda-event-"+e.status} id={"agenda-"+e.id} key={e.id}>
    <div className="agenda-event-date"><CalendarClock size={18}/><AgendaLocalDate iso={e.startsAt.toISOString()}/><small>{e.durationMinutes} minutos</small></div>
    <div className="agenda-event-main">
     <div className="agenda-event-heading"><strong>{e.title}</strong><span className={"agenda-event-status agenda-event-status-"+e.status}>{agendaStatusLabel(e.status)}</span></div>
     <p>{agendaLabel(e.type)} · <Link className="inline-link" href={"/admin/leads/"+encodeURIComponent(e.leadId)}>{e.lead.name}</Link>{e.lead.assignedAgent?.name?" · "+e.lead.assignedAgent.name:" · Sin agente"}</p>
     {e.location&&<p className="agenda-event-place"><MapPin size={14}/>{e.location}</p>}
     {e.meetingUrl&&<p className="agenda-event-place"><a href={e.meetingUrl} target="_blank" rel="noopener noreferrer" className="inline-link">Abrir videoconferencia <ArrowUpRight size={14}/></a></p>}
     {e.notes&&<p className="agenda-event-notes">{e.notes}</p>}
    </div>
    <div className="agenda-event-controls">
     {e.status==="pendiente"?<>
      <form method="post" action={"/api/admin/agenda/"+encodeURIComponent(e.id)}><input type="hidden" name="intent" value="status"/><input type="hidden" name="mes" value={month}/><input type="hidden" name="status" value="realizada"/><button type="submit" className="btn wizard-back"><CheckCircle2 size={15}/> Realizada</button></form>
      <form method="post" action={"/api/admin/agenda/"+encodeURIComponent(e.id)}><input type="hidden" name="intent" value="status"/><input type="hidden" name="mes" value={month}/><input type="hidden" name="status" value="cancelada"/><button type="submit" className="btn wizard-back">Cancelar actividad</button></form>
     </>:<form method="post" action={"/api/admin/agenda/"+encodeURIComponent(e.id)}><input type="hidden" name="intent" value="status"/><input type="hidden" name="mes" value={month}/><input type="hidden" name="status" value="pendiente"/><button type="submit" className="btn wizard-back">Reabrir</button></form>}
     <details className="agenda-reprogram"><summary>Reprogramar</summary><AgendaRescheduleForm id={e.id} startsAt={e.startsAt.toISOString()} durationMinutes={e.durationMinutes} month={month} meetingUrl={e.meetingUrl} mailEnabled={emailReady} type={e.type}/></details>
    </div>
   </article>)}</div>:<div className="admin-empty"><CalendarDays size={28}/><p>No hay actividades registradas con estos filtros.</p></div>}
   {events.length===300&&<p className="property-help">Se muestran las primeras 300 actividades. Acota los filtros para consultar otras fechas.</p>}
  </section>}
  <p className="property-help">Las reuniones son registros internos; se puede adjuntar una videollamada HTTPS sin crearla en el proveedor. Los avisos SMTP llegan únicamente al destinatario configurado, cuando se selecciona la opción de correo. No se envían invitaciones automáticas al prospecto ni recordatorios programados.</p>
 </section>;
}
