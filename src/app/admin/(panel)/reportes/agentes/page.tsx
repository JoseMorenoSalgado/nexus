import Link from "next/link";
import {notFound} from "next/navigation";
import {ArrowLeft,ArrowUpRight,CalendarClock,CheckCircle2,ClipboardList,House,UsersRound} from "lucide-react";
import {requireRole} from "@/lib/auth";
import {generateAgentPerformance} from "@/lib/agent-performance";
import {prisma} from "@/lib/prisma";
import {leadWhere,managesAllLeads} from "@/lib/agent-scope";
import {parseRoles} from "@/lib/roles";

export const dynamic="force-dynamic";
const number=(n:number)=>new Intl.NumberFormat("es-NI").format(n);
const percentage=(n:number|null)=>n===null?"—":n.toLocaleString("es-NI",{maximumFractionDigits:1})+"%";
const date=(d:Date)=>d.toLocaleDateString("es-NI",{day:"2-digit",month:"short",year:"numeric",timeZone:"UTC"});
const stages=[["nuevo","Nuevos"],["contactado","Contactados"],["visita","Visita programada"],["negociacion","En negociación"],["cerrado","Cerrados"],["descartado","Descartados"]] as const;
export default async function AgentPerformance({searchParams}:{searchParams:Promise<{periodo?:string;agente?:string}>}){
 const admin=await requireRole(["admin","editor","agente"]);
 const query=await searchParams;
 const canCompare=managesAllLeads(admin);
 // An agent cannot request aggregate data or another agent's ID, even through a direct URL.
 if(!canCompare&&query.agente&&query.agente!==admin.userId)notFound();
 const selected=canCompare?(query.agente||undefined):admin.userId;
 if(selected&&selected.length>100)notFound();
 const report=await generateAgentPerformance(admin.tenantId,query.periodo,selected);
 if(selected&&!report.agents.length)notFound();
 const showOnly=report.agents.length===1?report.agents[0]:null;
 const filterLink=(days:number)=>"/admin/reportes/agentes?periodo="+days+(selected?"&agente="+encodeURIComponent(selected):"");
 const where=leadWhere(admin);
 const due=report.crmActive?await prisma.leadCrm.findMany({
  where:{tenantId:admin.tenantId,status:{notIn:["cerrado","descartado"]},nextContactAt:{not:null},
   lead:{...where,...(selected?{assignedAgentId:selected}:{}),assignedAgentId:{not:null,...(selected?{equals:selected}:{})}}},
  select:{nextContactAt:true,status:true,lead:{select:{id:true,name:true,assignedAgent:{select:{name:true}}}}},
  orderBy:{nextContactAt:"asc"},take:8
 }):[];
 return <section className="agent-performance">
  <div className="admin-heading"><div>
   <Link className="inline-link" href={canCompare?"/admin/reportes":"/admin"}><ArrowLeft size={16}/> {canCompare?"Reportes comerciales":"Mi espacio comercial"}</Link>
   <h1>{canCompare?"Rendimiento de agentes":"Mi rendimiento comercial"}</h1>
   <p>{canCompare?"Consulta la cartera y las gestiones de cada agente.":"Consulta tus prospectos, visitas y seguimientos registrados."}</p>
  </div></div>
  <div className="agent-report-controls">
   <nav aria-label="Período del informe" className="reports-periods">
    {[7,30,90].map(days=><Link href={filterLink(days)} key={days} className={report.days===days?"selected":""} aria-current={report.days===days?"page":undefined}>{days} días</Link>)}
   </nav>
   {canCompare&&<form action="/admin/reportes/agentes" method="get">
    <input type="hidden" name="periodo" value={report.days}/>
    <label htmlFor="agent-report-select">Agente</label>
    <select id="agent-report-select" name="agente" defaultValue={selected||""}>
     <option value="">Todos los agentes</option>
     {(await prisma.adminUser.findMany({where:{tenantId:admin.tenantId},select:{id:true,name:true,role:true},orderBy:{name:"asc"}})).filter(u=>{
      return parseRoles(u.role).includes("agente");
     }).map(u=><option value={u.id} key={u.id}>{u.name}</option>)}
    </select>
    <button className="btn wizard-back" type="submit">Aplicar</button>
   </form>}
  </div>
  <p className="property-help">Cohorte: contactos recibidos del {report.from} al {report.through} (UTC). El estado y el responsable mostrados son los actuales. Las propiedades asignadas y los seguimientos pendientes se calculan a la fecha, independientemente del período.</p>
  <div className="agent-performance-metrics">
   <div><UsersRound size={20}/><span>Prospectos de agentes</span><strong>{number(report.totals.leads)}</strong><small>Recibidos en el período</small></div>
   <div><House size={20}/><span>Propiedades asignadas</span><strong>{number(report.totals.properties)}</strong><small>Cartera actual</small></div>
   <div><CalendarClock size={20}/><span>Visitas programadas</span><strong>{report.crmActive?number(report.totals.visits):"—"}</strong><small>Prospectos en etapa «visita»</small></div>
   <div><CheckCircle2 size={20}/><span>Cierres registrados</span><strong>{report.crmActive?number(report.totals.closed):"—"}</strong><small>Prospectos en etapa «cerrado»</small></div>
   <div><ClipboardList size={20}/><span>Seguimientos vencidos</span><strong>{report.crmActive?number(report.totals.overdue):"—"}</strong><small>Próxima fecha de contacto anterior a hoy</small></div>
   <div><CalendarClock size={20}/><span>Próximos 7 días</span><strong>{report.crmActive?number(report.totals.upcoming):"—"}</strong><small>Contactos futuros registrados</small></div>
  </div>
  {!report.crmActive&&<div className="admin-panel"><p>Para disponer de etapas comerciales, visitas, cierres y recordatorios es necesario activar el CRM.</p><Link href="/admin/leads" className="inline-link">Ir a prospectos →</Link></div>}
  {canCompare&&!selected&&<p className="property-help">{number(report.unassigned)} prospectos del período no tienen responsable y no se incluyen en los resultados de agentes. <Link href="/admin/leads?agent=none">Revisar los no asignados →</Link></p>}
  <section className="admin-panel"><div className="heading-row"><div><h2>{showOnly?"Resultados de "+showOnly.name:"Comparativa de agentes"}</h2><p>El porcentaje de cierre es la proporción de prospectos de esta cohorte cuyo estado actual es «cerrado».</p></div></div>
   {report.agents.length?<div className="report-table-scroll"><table className="report-table agent-report-table">
    <thead><tr><th>Agente</th><th>Propiedades</th><th>Prospectos</th><th>Visitas</th><th>Negociación</th><th>Cierres</th><th>% cierre</th><th>Vencidos</th><th>Próximos 7 días</th></tr></thead>
    <tbody>{report.agents.map(a=><tr key={a.id}>
     <td><strong>{a.name}</strong><span>{a.active?"Activo":"Inactivo"}</span>{canCompare&&admin.roles.includes("admin")&&<Link className="inline-link" href={"/admin/clientes-agentes/agentes/"+encodeURIComponent(a.id)}>Ver perfil <ArrowUpRight size={13}/></Link>}</td>
     <td>{number(a.properties)}</td><td>{number(a.leads)}</td><td>{report.crmActive?number(a.stages.visita):"—"}</td>
     <td>{report.crmActive?number(a.stages.negociacion):"—"}</td><td>{report.crmActive?number(a.stages.cerrado):"—"}</td>
     <td>{percentage(a.conversion)}</td><td className={a.overdue?"agent-report-alert":""}>{report.crmActive?number(a.overdue):"—"}</td>
     <td>{report.crmActive?number(a.upcoming):"—"}</td>
    </tr>)}</tbody>
   </table></div>:<p className="admin-empty">Todavía no hay agentes comerciales registrados.</p>}
  </section>
  {showOnly&&report.crmActive&&<section className="admin-panel agent-performance-stages"><h2>Embudo comercial de {showOnly.name}</h2>
   <p>Etapa actual de los prospectos recibidos en el período seleccionado.</p>
   <div className="agent-stage-grid">{stages.map(([key,label])=><div key={key}><span>{label}</span><strong>{number(showOnly.stages[key])}</strong></div>)}</div>
  </section>}
  {report.crmActive&&<section className="admin-panel"><div className="heading-row"><div><h2>Agenda de seguimiento</h2><p>Los próximos ocho seguimientos pendientes, comenzando por los vencidos.</p></div>
   <Link href="/admin/leads" className="inline-link">Abrir CRM <ArrowUpRight size={15}/></Link></div>
   {due.length?<div className="agent-report-agenda">{due.map(d=><div key={d.lead.id}>
    <div><strong>{d.lead.name}</strong><small>{canCompare?d.lead.assignedAgent?.name+" · ":""}{d.status==="visita"?"Visita programada":"Seguimiento pendiente"}</small></div>
    <span>{d.nextContactAt?date(d.nextContactAt):"—"}</span><Link href={"/admin/leads/"+encodeURIComponent(d.lead.id)} className="inline-link">Ver ficha</Link>
   </div>)}</div>:<p className="admin-empty">No hay seguimientos pendientes en la cartera consultada.</p>}
  </section>}
  <p className="reports-disclaimer">Estas cifras se basan en los registros del CRM y no prueban ventas efectivas ni visitas realizadas. «Visita programada» representa el estado comercial actual, no una cita confirmada en calendario. La tasa de cierre no debe interpretarse como ingreso o comisión.</p>
 </section>;
}
