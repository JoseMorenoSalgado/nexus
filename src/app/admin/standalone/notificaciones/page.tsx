import Link from "next/link";
import {notFound} from "next/navigation";
import {requireRole} from "@/lib/auth";
import {getStandalonePrisma} from "@/lib/prisma-standalone";
export const dynamic="force-dynamic";
export default async function StandaloneNotifications(){
 if(process.env.NEXUS_STANDALONE!=="true")notFound();
 const admin=await requireRole(["admin","editor","agente"]);
 const manager=admin.roles.includes("admin")||admin.roles.includes("editor");
 const db=getStandalonePrisma();
 const now=new Date();
 const next=new Date(now.getTime()+7*86400000);
 const scope=manager?{}:{lead:{is:{assignedAgentId:admin.userId}}};
 const leadScope=manager?{}:{assignedAgentId:admin.userId};
 const [overdue,upcoming,unassigned,unattended]=await Promise.all([
  db.agendaEvent.findMany({where:{...scope,status:"pendiente",startsAt:{lt:now}},take:30,orderBy:{startsAt:"asc"},select:{id:true,title:true,startsAt:true,lead:{select:{name:true}}}}),
  db.agendaEvent.findMany({where:{...scope,status:"pendiente",startsAt:{gte:now,lt:next}},take:30,orderBy:{startsAt:"asc"},select:{id:true,title:true,startsAt:true,lead:{select:{name:true}}}}),
  manager?db.lead.count({where:{assignedAgentId:null}}):Promise.resolve(0),
  db.lead.count({where:{...leadScope,crm:{is:null}}})
 ]);
 return <section className="notification-center">
  <div className="admin-heading"><div><h1>Notificaciones comerciales</h1><p>Alertas calculadas exclusivamente con datos de la instalación independiente.</p></div></div>
  <div className="notification-summary"><div className="notification-summary-card"><span>Actividades vencidas (primeras 30)</span><strong>{overdue.length}{overdue.length===30?"+":""}</strong></div><div className="notification-summary-card"><span>Próximos 7 días (primeras 30)</span><strong>{upcoming.length}{upcoming.length===30?"+":""}</strong></div><div className="notification-summary-card"><span>Prospectos sin seguimiento CRM</span><strong>{unattended}</strong></div>{manager&&<div className="notification-summary-card"><span>Prospectos sin agente</span><strong>{unassigned}</strong></div>}</div>
  <div className="admin-panel"><h2>Actividades vencidas</h2>{overdue.length?overdue.map(e=><p key={e.id}><strong>{e.lead.name}</strong> · {e.title} · {e.startsAt.toISOString().slice(0,16).replace("T"," ")} UTC</p>):<p>No hay actividades vencidas.</p>}</div>
  <div className="admin-panel"><h2>Próximas actividades</h2>{upcoming.length?upcoming.map(e=><p key={e.id}><strong>{e.lead.name}</strong> · {e.title} · {e.startsAt.toISOString().slice(0,16).replace("T"," ")} UTC</p>):<p>No hay actividades próximas.</p>}</div>
  <Link href="/admin/agenda" className="btn wizard-back">Abrir agenda comercial</Link>
 </section>;
}
