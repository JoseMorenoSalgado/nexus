import Link from "next/link";
import {Bell,AlertTriangle,ArrowUpRight,CalendarClock} from "lucide-react";
import {commercialNotifications,type NotificationCategory} from "@/lib/commercial-notifications";
import type {AgentScope} from "@/lib/agent-scope";
import {AgendaLocalDate} from "@/components/agenda-calendar";
const display:Record<NotificationCategory,string>={
 vencidas:"Vencida",proximas:"Próxima", "sin-atender":"Sin atender","sin-asignar":"Sin agente"
};
export async function CommercialAlertsPreview({user}:{user:AgentScope}){
 const notifications=await commercialNotifications(user,{limit:3});
 const pending=notifications.counts.vencidas+notifications.counts.proximas+notifications.counts["sin-atender"];
 if(!pending&&!notifications.items.length)return null;
 return <section className="admin-panel dashboard-alert-preview" aria-labelledby="dashboard-alert-title">
  <div className="heading-row"><div><h2 id="dashboard-alert-title"><Bell size={19}/> Centro de actividades</h2>
   <p>Gestiona primero las actividades que necesitan atención.</p></div>
   <Link className="inline-link" href="/admin/notificaciones">Ver todas <ArrowUpRight size={15}/></Link>
  </div>
  <div className="dashboard-alert-metrics">
   <Link href="/admin/notificaciones?categoria=vencidas"><AlertTriangle size={18}/><strong>{notifications.counts.vencidas}</strong><span>Vencidas</span></Link>
   <Link href="/admin/notificaciones?categoria=proximas"><CalendarClock size={18}/><strong>{notifications.counts.proximas}</strong><span>Próximas 24 h</span></Link>
   <Link href="/admin/notificaciones?categoria=sin-atender"><Bell size={18}/><strong>{notifications.counts["sin-atender"]}</strong><span>Sin atender</span></Link>
  </div>
  {notifications.items.length?<div className="dashboard-alert-items">
   {notifications.items.slice(0,2).map(n=><Link key={n.id} href={n.href} className="dashboard-alert-item">
    <span className={"dashboard-alert-dot dashboard-alert-"+n.category}/><span className="dashboard-alert-label">
     <strong>{n.title}</strong><small>{display[n.category]} · {n.detail}</small>
    </span><span className="dashboard-alert-date"><AgendaLocalDate iso={n.date}/></span>
   </Link>)}
  </div>:<p className="property-help">No hay actividades o prospectos pendientes para revisar.</p>}
 </section>;
}
