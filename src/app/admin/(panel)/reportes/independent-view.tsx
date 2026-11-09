import Link from "next/link";
import {notFound} from "next/navigation";
import {requireRole} from "@/lib/auth";
import {getStandalonePrisma} from "@/lib/prisma-standalone";
export const dynamic="force-dynamic";
const fmt=(n:number)=>new Intl.NumberFormat("es-NI").format(n);
export default async function StandaloneReports({searchParams}:{searchParams:Promise<{periodo?:string}>}){
 if(process.env.NEXUS_STANDALONE!=="true")notFound();
 await requireRole(["admin","editor"]);
 const {periodo}=await searchParams;
 const days=[7,30,90].includes(Number(periodo))?Number(periodo):30;
 const from=new Date();from.setUTCHours(0,0,0,0);from.setUTCDate(from.getUTCDate()-(days-1));
 const db=getStandalonePrisma();
 const [properties,published,leads,webLeads,events,overdue,closings,views,propertyViews,whatsapp,statuses,sources]=await Promise.all([
  db.property.count(),db.property.count({where:{published:true}}),
  db.lead.count({where:{createdAt:{gte:from}}}),db.lead.count({where:{source:"web",createdAt:{gte:from}}}),
  db.agendaEvent.count({where:{startsAt:{gte:from}}}),db.agendaEvent.count({where:{status:"pendiente",startsAt:{lt:new Date()}}}),
  db.commercialClosing.aggregate({where:{status:"confirmado",closedAt:{gte:from}},_count:{_all:true},_sum:{amount:true,commissionAmount:true}}),
  db.visitEvent.count({where:{kind:"page_view",createdAt:{gte:from}}}),
  db.visitEvent.count({where:{kind:"property_view",createdAt:{gte:from}}}),
  db.visitEvent.count({where:{kind:"whatsapp_click",createdAt:{gte:from}}}),
  db.leadCrm.groupBy({by:["status"],where:{lead:{createdAt:{gte:from}}},_count:{_all:true}}),
  db.lead.groupBy({by:["source"],where:{createdAt:{gte:from}},_count:{_all:true}})
 ]);
 const metricGroups=[
  {title:"Inventario y actividad comercial",items:[
   ["Propiedades registradas",properties],["Propiedades publicadas",published],
   ["Prospectos del período",leads],["Actividades del período",events],
   ["Actividades vencidas",overdue],["Cierres confirmados",closings._count._all]
  ]},
  {title:"Actividad del sitio web",items:[
   ["Consultas web",webLeads],["Vistas de páginas",views],
   ["Vistas de propiedades",propertyViews],["Clics en WhatsApp",whatsapp]
  ]}
 ] as const;
 return <section className="reports-dashboard">
  <div className="admin-heading"><div><h1>Reportes comerciales</h1><p>Consulta el inventario, el seguimiento comercial y la actividad del sitio.</p></div></div>
  <nav className="reports-periods" aria-label="Período de estadísticas">{[7,30,90].map(d=><Link key={d} href={"/admin/reportes?periodo="+d} aria-current={days===d?"page":undefined} className={days===d?"selected":""}>{d} días</Link>)}</nav>
  <p className="report-period-description">Desde {from.toISOString().slice(0,10)} · Fechas UTC. Los totales de propiedades corresponden al inventario actual.</p>
  {metricGroups.map(group=><section className="report-overview" key={group.title}>
   <h2>{group.title}</h2>
   <div className="report-kpis">{group.items.map(([label,value])=><div className="report-kpi" key={label}>
    <div className="report-kpi-heading"><span>{label}</span></div><strong>{fmt(value)}</strong>
   </div>)}</div>
  </section>)}
  <section className="admin-panel"><h2>Operaciones confirmadas</h2><p>Importe registrado: USD {Number(closings._sum.amount||0).toLocaleString("es-NI",{minimumFractionDigits:2,maximumFractionDigits:2})} · Comisiones: USD {Number(closings._sum.commissionAmount||0).toLocaleString("es-NI",{minimumFractionDigits:2,maximumFractionDigits:2})}</p><small>Solo operaciones confirmadas; los estados del CRM no cuentan como ventas.</small></section>
  <div className="admin-panels"><section className="admin-panel"><h2>Estados del CRM</h2>{statuses.length?statuses.map(s=><p key={s.status}>{s.status}: {fmt(s._count._all)}</p>):<p>No hay estados registrados en el período.</p>}</section><section className="admin-panel"><h2>Origen de prospectos</h2>{sources.map(s=><p key={s.source}>{s.source}: {fmt(s._count._all)}</p>)}</section></div>
 </section>;
}
