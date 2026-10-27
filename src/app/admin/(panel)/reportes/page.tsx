import Link from "next/link";
import {ArrowUpRight,BarChart3,CalendarClock,Download,Eye,House,MessageCircle,Users,CheckCircle2,HandCoins} from "lucide-react";
import {requireRole} from "@/lib/auth";
import {generateReport,resolveReportPeriod} from "@/lib/real-estate-reports";
import {prisma} from "@/lib/prisma";
import {closingTableReady} from "@/lib/closing-schema";
import {closingMoney} from "@/lib/closing-utils";
export const dynamic="force-dynamic";
const number=(value:number)=>new Intl.NumberFormat("es-NI").format(value);
function Metric({label,value,hint,Icon}:{label:string;value:string;hint:string;Icon:typeof Eye}){
 return <div className="report-kpi"><div className="report-kpi-heading"><span>{label}</span><Icon size={20} aria-hidden="true"/></div>
  <strong>{value}</strong><small>{hint}</small></div>;
}
export default async function Reports({searchParams}:{searchParams:Promise<{periodo?:string}>}){
 const admin=await requireRole(["admin","editor"]);
 const {periodo}=await searchParams;
 const days=resolveReportPeriod(periodo);
 const report=await generateReport(admin.tenantId,days);
 const closingsReady=await closingTableReady();
 const from=new Date();from.setUTCHours(0,0,0,0);from.setUTCDate(from.getUTCDate()-(days-1));
 const through=new Date();through.setUTCHours(0,0,0,0);through.setUTCDate(through.getUTCDate()+1);
 const realClosings=closingsReady?await prisma.commercialClosing.groupBy({by:["kind"],
  where:{tenantId:admin.tenantId,status:"confirmado",closedAt:{gte:from,lt:through}},
  _count:{_all:true},_sum:{amount:true,commissionAmount:true}}):[];
 const realAmount=realClosings.reduce((v,c)=>v+Number(c._sum.amount||0),0);
 const realCommission=realClosings.reduce((v,c)=>v+Number(c._sum.commissionAmount||0),0);
 const maxStage=Math.max(1,...report.statuses.map(s=>s.count));
 const maxSource=Math.max(1,...report.sources.map(s=>s.count));
 return <>
  <div className="admin-heading">
   <div><h1>Reportes comerciales</h1><p>Consultas, interés por inmueble y seguimiento de prospectos.</p></div>
   <div className="agent-report-header-links"><Link className="btn wizard-back" href={"/admin/reportes/agentes?periodo="+days}>Rendimiento por agente</Link>
   <Link className="btn wizard-back" href="/admin/cierres">Operaciones confirmadas</Link>
   <Link className="btn wizard-back" href="/admin/cierres/comisiones">Comisiones y abonos</Link>
   <Link className="btn wizard-back" href={"/api/admin/reportes/csv?periodo="+days}><Download size={17}/> Exportar CSV</Link></div>
  </div>
  <div className="reports-toolbar">
   <nav aria-label="Período de estadísticas" className="reports-periods">
    {[7,30,90].map(d=><Link key={d} href={"/admin/reportes?periodo="+d}
     aria-current={days===d?"page":undefined} className={days===d?"selected":""}>{d} días</Link>)}
   </nav>
   <span>Del {report.from} al {report.through} · Fechas UTC</span>
  </div>
  <div className="report-kpis">
   <Metric label="Vistas del sitio" value={number(report.views)} hint="Páginas cargadas; no usuarios únicos" Icon={Eye}/>
   <Metric label="Vistas de inmuebles" value={number(report.detailViews)} hint="Eventos en fichas de propiedades" Icon={House}/>
   <Metric label="Clics en WhatsApp" value={number(report.whatsapp)} hint="No confirman conversaciones" Icon={MessageCircle}/>
   <Metric label="Consultas web" value={number(report.webLeads)} hint="Formularios recibidos" Icon={Users}/>
   <Metric label="Contactos registrados" value={number(report.otherLeads)} hint="WhatsApp, teléfono o atención directa" Icon={BarChart3}/>
   <Metric label="Cierres registrados" value={report.crmActive?number(report.closed):"—"} hint={report.crmActive?"Estado actual de consultas del período":"Activa CRM para registrar cierres"} Icon={CheckCircle2}/>
  </div>
  <section className="admin-panel report-real-closings">
   <div className="heading-row"><div><h2>Ventas y alquileres registrados</h2><p>Operaciones declaradas en el módulo de cierres; excluye anulaciones y estados del CRM.</p></div><Link href="/admin/cierres" className="inline-link">Ver operaciones <ArrowUpRight size={15}/></Link></div>
   {closingsReady?<div className="closing-metrics">
    <div><House size={19}/><span>Ventas</span><strong>{number(realClosings.find(c=>c.kind==="venta")?._count._all||0)}</strong></div>
    <div><CheckCircle2 size={19}/><span>Alquileres</span><strong>{number(realClosings.find(c=>c.kind==="alquiler")?._count._all||0)}</strong></div>
    <div><BarChart3 size={19}/><span>Importe USD</span><strong>{closingMoney(realAmount)}</strong></div>
    <div><HandCoins size={19}/><span>Comisiones USD</span><strong>{closingMoney(realCommission)}</strong></div>
   </div>:<p className="property-help">El registro de operaciones reales aún no está activado. <Link href="/admin/cierres">Activar cierres →</Link></p>}
  </section>
  <div className="report-ratios">
   <div><span>Consultas web / vistas de inmuebles</span>
    <strong>{report.formRatio===null?"—":report.formRatio.toLocaleString("es-NI")+"%"}</strong>
    <small>Relación orientativa entre eventos; no mide visitantes únicos ni atribución individual.</small>
   </div>
   <div><span>Prospectos cerrados / consultas recibidas</span>
    <strong>{report.closedRatio===null?"—":report.closedRatio.toLocaleString("es-NI")+"%"}</strong>
    <small>Estado actual de los contactos creados en el período seleccionado.</small>
   </div>
   <div><span>Próximos contactos vencidos</span>
    <strong>{report.crmActive?number(report.overdue):"—"}</strong>
    <small>Seguimientos pendientes a la fecha, independiente del período seleccionado.</small>
   </div>
  </div>
  {!report.crmActive&&<section className="report-setup-info">
   <CalendarClock size={23}/><div><strong>Completa la activación del CRM</strong>
   <p>Los contactos y las vistas ya se muestran. Para ver etapas comerciales, cierres y próximos contactos necesitas activar las tablas de seguimiento.</p></div>
   <Link href="/admin/leads" className="btn wizard-back">Ir a prospectos</Link>
  </section>}
  <div className="reports-panels">
   <section className="admin-panel report-breakdown"><h2>Etapas del CRM</h2><p>Estado actual de los prospectos que entraron en este período.</p>
    {report.crmActive?<div className="report-bars">{report.statuses.map(row=>
     <div className="report-bar-row" key={row.name}>
      <div><span>{row.name}</span><strong>{number(row.count)}</strong></div>
      <div className="report-bar-track"><span style={{width:(row.count/maxStage*100)+"%"}}/></div>
     </div>)}</div>:<p className="admin-empty">Pendiente de activación.</p>}
   </section>
   <section className="admin-panel report-breakdown"><h2>Origen de las consultas</h2><p>Canales registrados al recibir la solicitud.</p>
    {report.sources.length?<div className="report-bars">{report.sources.map(row=>
     <div className="report-bar-row" key={row.name}>
      <div><span>{row.name==="web"?"Formulario web":row.name==="whatsapp"?"WhatsApp manual":row.name==="telefono"?"Llamada telefónica":row.name==="manual"?"Atención directa":row.name}</span><strong>{number(row.count)}</strong></div>
      <div className="report-bar-track"><span style={{width:(row.count/maxSource*100)+"%"}}/></div>
     </div>)}</div>:<p className="admin-empty">Aún no se registran consultas en este período.</p>}
    <small>{number(report.generalLeads)} consultas generales sin inmueble asociado.</small>
   </section>
  </div>
  <section className="admin-panel report-property-panel">
   <div className="heading-row"><div><h2>Interés por inmueble</h2><p>Ordenado por consultas asociadas y clics registrados.</p></div>
    <Link href="/admin/propiedades" className="inline-link">Administrar propiedades <ArrowUpRight size={15}/></Link>
   </div>
   {report.properties.length?<div className="report-table-scroll"><table className="report-table">
    <thead><tr><th>Propiedad</th><th>Vistas</th><th>WhatsApp</th><th>Consultas web</th><th>Otros contactos</th><th>Cierres</th></tr></thead>
    <tbody>{report.properties.slice(0,15).map(p=><tr key={p.id}>
     <td><Link href={"/admin/propiedades/"+encodeURIComponent(p.id)+"/editar"}><strong>{p.refCode}</strong><span>{p.title}</span></Link></td>
     <td>{number(p.views)}</td><td>{number(p.whatsapp)}</td><td>{number(p.webLeads)}</td>
     <td>{number(p.otherLeads)}</td><td>{report.crmActive?number(p.closed):"—"}</td>
    </tr>)}</tbody>
   </table></div>:<p className="admin-empty">Todavía no hay propiedades registradas.</p>}
   {report.properties.length>15&&<p className="property-help">Se muestran los 15 primeros inmuebles. Exporta el CSV para consultar todos los registros.</p>}
  </section>
  <p className="reports-disclaimer">Los cierres del CRM no prueban ventas efectivas: las ventas y alquileres con importe se registran por separado en Operaciones confirmadas. Las vistas y los clics son eventos técnicos registrados en la web, no personas únicas. No se puede afirmar que un clic de WhatsApp produjo una venta. Los registros de cierre corresponden a las etapas seleccionadas manualmente en el CRM.</p>
 </>;
}
