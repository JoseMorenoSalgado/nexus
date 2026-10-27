import Link from "next/link";
import {AlertTriangle,Bell,CalendarClock,ClipboardList,UserRound,ArrowUpRight,RefreshCw} from "lucide-react";
import {requireRole} from "@/lib/auth";
import {commercialNotifications,notificationCategory,notificationCategoryNames,type NotificationCategory} from "@/lib/commercial-notifications";
import {AgendaLocalDate} from "@/components/agenda-calendar";
export const dynamic="force-dynamic";
const groups:{value:NotificationCategory;Icon:typeof Bell}[]=[
 {value:"vencidas",Icon:AlertTriangle},{value:"proximas",Icon:CalendarClock},
 {value:"sin-atender",Icon:ClipboardList},{value:"sin-asignar",Icon:UserRound}
];
export default async function NotificationsPage({searchParams}:{searchParams:Promise<{categoria?:string}>}){
 const user=await requireRole(["admin","editor","agente"]);
 const q=await searchParams;
 const chosen=notificationCategory(q.categoria);
 const snapshot=await commercialNotifications(user,{limit:45,category:chosen});
 const allowed=groups.filter(g=>g.value!=="sin-asignar"||user.roles.some(role=>role==="admin"||role==="editor"));
 return <section className="notification-center">
  <div className="admin-heading"><div><h1>Centro de notificaciones</h1><p>Prioriza las gestiones comerciales pendientes y accede directamente a sus fichas.</p></div>
   <Link href="/admin/notificaciones" className="btn wizard-back"><RefreshCw size={16}/> Actualizar</Link>
  </div>
  <div className="notification-summary">
   {allowed.map(({value,Icon})=><Link href={"/admin/notificaciones?categoria="+value} key={value}
    className={"notification-summary-card"+(chosen===value?" selected":"")}>
    <Icon size={20}/><span>{notificationCategoryNames[value]}</span>
    <strong>{snapshot.counts[value]}</strong>
   </Link>)}
  </div>
  <div className="admin-panel">
   <div className="heading-row"><div><h2>{chosen==="todas"?"Gestiones que requieren atención":notificationCategoryNames[chosen]}</h2>
    <p>Las alertas se calculan con los datos actuales de tu agenda y CRM.</p></div>
   <Link href="/admin/notificaciones" className="inline-link">Ver todas <ArrowUpRight size={15}/></Link></div>
   <div className="notification-tabs" aria-label="Filtrar notificaciones">
    <Link href="/admin/notificaciones" aria-current={chosen==="todas"?"page":undefined} className={chosen==="todas"?"active":""}>Todas</Link>
    {allowed.map(x=><Link key={x.value} href={"/admin/notificaciones?categoria="+x.value}
     aria-current={chosen===x.value?"page":undefined} className={chosen===x.value?"active":""}>{notificationCategoryNames[x.value]}</Link>)}
   </div>
   {snapshot.items.length?<div className="notification-list">
    {snapshot.items.map(item=><Link key={item.id} href={item.href} className={"notification-item notification-"+item.category}>
     <span className="notification-mark">{item.category==="vencidas"?<AlertTriangle size={19}/>:
      item.category==="proximas"?<CalendarClock size={19}/>:
      item.category==="sin-atender"?<ClipboardList size={19}/>:<UserRound size={19}/>}</span>
     <span className="notification-content"><strong>{item.title}</strong><small>{item.detail}</small>
      <span><AgendaLocalDate iso={item.date}/></span></span>
     <ArrowUpRight size={18} className="notification-arrow"/>
    </Link>)}
   </div>:<p className="admin-empty">No hay gestiones pendientes de esta categoría.</p>}
   {snapshot.total>snapshot.items.length&&<p className="property-help">Se muestran hasta {snapshot.items.length} alertas priorizadas. Usa los filtros para revisar más casos.</p>}
  </div>
  {(!snapshot.agendaReady||!snapshot.crmReady)&&<p className="panel-notice">Algunas alertas no están disponibles porque todavía debe activarse {[
   !snapshot.agendaReady?"Agenda comercial":null,!snapshot.crmReady?"CRM":null].filter(Boolean).join(" y ")}.</p>}
  <p className="property-help">Las cifras indican gestiones pendientes, no mensajes sin leer. Se actualizan cuando visitas o recargas la página; no se envían notificaciones externas automáticamente. Un prospecto puede aparecer en más de una categoría.</p>
 </section>;
}
