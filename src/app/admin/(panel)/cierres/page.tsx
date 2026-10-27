import Link from "next/link";
import {ArrowUpRight,CheckCircle2,FileDown,FileText,HandCoins,House,ShieldCheck,TrendingUp,Undo2} from "lucide-react";
import {requireRole} from "@/lib/auth";
import {prisma} from "@/lib/prisma";
import {closingTableReady} from "@/lib/closing-schema";
import {closingMoney,closingWhere} from "@/lib/closing-utils";
import {parseRoles} from "@/lib/roles";
import {managesAllLeads} from "@/lib/agent-scope";
import {resolveReportPeriod} from "@/lib/real-estate-reports";
export const dynamic="force-dynamic";
const errors:Record<string,string>={
 permisos:"No tienes permisos para esta operación.",origen:"La solicitud no procede del sitio autorizado.",
 datos:"Revisa los importes, fecha y campos del cierre.",respaldo:"Confirma que existe un respaldo recuperable.",
 inactivo:"Activa el módulo de cierres.",propiedad:"Selecciona un prospecto con propiedad de esta inmobiliaria.",
 operacion:"El tipo de cierre no coincide con la operación registrada en la propiedad.",
 agente:"Elige un agente activo de la inmobiliaria.",comision:"La comisión no puede superar el importe de la operación.",
 duplicado:"Ya existe un cierre registrado para este prospecto. Evita registrar la misma operación dos veces.",
 motivo:"Indica un motivo de anulación de al menos 10 caracteres.",
 noexiste:"Este cierre ya no está disponible para modificarlo.",servidor:"No fue posible completar la operación. Revisa los registros del servidor."
};
const dt=(d:Date)=>d.toLocaleDateString("es-NI",{day:"2-digit",month:"short",year:"numeric",timeZone:"UTC"});
export default async function Closings({searchParams}:{searchParams:Promise<{periodo?:string;agente?:string;tipo?:string;estado?:string;lead?:string;activated?:string;created?:string;voided?:string;error?:string}>}){
 const user=await requireRole(["admin","editor","agente"]);
 const q=await searchParams;
 const all=managesAllLeads(user),admin=user.roles.includes("admin");
 const ready=await closingTableReady();
 if(!ready)return <section className="closing-dashboard"><div className="admin-heading"><div><h1>Cierres comerciales</h1><p>Ventas y alquileres confirmados, independientes del estado de los prospectos.</p></div></div>
  <div className="admin-panel"><h2>Activar registro de operaciones</h2><p>Se añadirá una tabla independiente para registrar importes y comisiones sin modificar los prospectos existentes. La activación requiere una base de datos respaldada.</p>
  {q.error&&<p className="admin-error" role="alert">{errors[q.error]||errors.servidor}</p>}
  {admin?<form method="post" action="/api/admin/cierres/activate" className="closing-activation-form">
    <label><input type="checkbox" name="backupConfirmed" value="yes" required/> Confirmo que existe un respaldo recuperable de la base de datos.</label>
    <button className="btn btn-red" type="submit"><ShieldCheck size={17}/> Activar registro de cierres</button>
   </form>:<p className="property-help">Un administrador debe activar este módulo.</p>}
  </div></section>;
 const days=resolveReportPeriod(q.periodo);
 const from=new Date();from.setUTCHours(0,0,0,0);from.setUTCDate(from.getUTCDate()-(days-1));
 const today=new Date();
 const through=new Date(today);through.setUTCHours(0,0,0,0);through.setUTCDate(through.getUTCDate()+1);
 const staff=all?await prisma.adminUser.findMany({where:{tenantId:user.tenantId},select:{id:true,name:true,active:true,role:true},orderBy:{name:"asc"}}):[];
 const agents=staff.filter(a=>parseRoles(a.role).includes("agente"));
 const selected=all&&agents.some(a=>a.id===q.agente)?q.agente:"";
 const kind=q.tipo==="venta"||q.tipo==="alquiler"?q.tipo:"";
 const state=q.estado==="anulado"?"anulado":q.estado==="todos"?"todos":"confirmado";
 const conditions={...closingWhere(user),closedAt:{gte:from,lt:through},
  ...(selected?{agentId:selected}:{}),...(kind?{kind}:{}),
  ...(state==="todos"?{}:{status:state})};
 const [records,totals,count,leads]=await Promise.all([
  prisma.commercialClosing.findMany({where:conditions,orderBy:{closedAt:"desc"},take:100,
   select:{id:true,kind:true,clientName:true,propertyRefCode:true,agentName:true,agentId:true,closedAt:true,amount:true,commissionAmount:true,status:true,voidReason:true,voidedAt:true,createdByName:true,leadId:true}}),
  prisma.commercialClosing.aggregate({where:{...closingWhere(user),closedAt:{gte:from,lte:today},status:"confirmado",...(selected?{agentId:selected}:{})},
   _sum:{amount:true,commissionAmount:true},_count:{_all:true}}),
  prisma.commercialClosing.groupBy({by:["kind"],where:{...closingWhere(user),closedAt:{gte:from,lte:today},status:"confirmado",...(selected?{agentId:selected}:{})},_count:{_all:true}}),
  all?prisma.lead.findMany({where:{tenantId:user.tenantId,propertyId:{not:null},closing:{is:null}},take:200,orderBy:{createdAt:"desc"},
   select:{id:true,name:true,assignedAgentId:true,property:{select:{refCode:true,title:true,operation:true}}}}):Promise.resolve([])
 ]);
 const sold=count.find(c=>c.kind==="venta")?._count._all||0;
 const rented=count.find(c=>c.kind==="alquiler")?._count._all||0;
 const lookup=new URLSearchParams({periodo:String(days),tipo:kind,estado:state,agente:selected||""});
 const preselect=leads.some(l=>l.id===q.lead)?q.lead||"":"";
 return <section className="closing-dashboard">
  <div className="admin-heading"><div><h1>Cierres comerciales</h1><p>Operaciones registradas por el equipo, con importes y comisiones en dólares estadounidenses.</p></div>
   <div className="closing-download-actions"><Link className="btn wizard-back" href="/admin/cierres/comisiones"><HandCoins size={16}/> Comisiones y pagos</Link>
   <Link className="btn wizard-back" href={"/api/admin/cierres/pdf?periodo="+days+(selected?"&agente="+encodeURIComponent(selected):"")}><FileText size={16}/> Reporte PDF</Link>
   <Link className="btn wizard-back" href={"/api/admin/cierres/csv?periodo="+days+(selected?"&agente="+encodeURIComponent(selected):"")}><FileDown size={16}/> Exportar CSV</Link></div>
  </div>
  {(q.created||q.voided||q.activated)&&<p className="property-success" role="status">{q.created?"Operación registrada correctamente.":q.voided?"Operación anulada y conservada en el historial.":"Módulo activado."}</p>}
  {q.error&&<p className="admin-error" role="alert">{errors[q.error]||errors.servidor}</p>}
  <div className="closing-metrics">
   <div><House size={19}/><span>Ventas registradas</span><strong>{sold}</strong></div>
   <div><CheckCircle2 size={19}/><span>Alquileres registrados</span><strong>{rented}</strong></div>
   <div><TrendingUp size={19}/><span>Importe total</span><strong>{closingMoney(totals._sum.amount?.toString()||"0")}</strong></div>
   <div><HandCoins size={19}/><span>Comisiones registradas</span><strong>{closingMoney(totals._sum.commissionAmount?.toString()||"0")}</strong></div>
  </div>
  <p className="property-help">Las cifras agregadas excluyen registros anulados. Los importes representan operaciones declaradas por el personal; no certifican pagos o escrituras. Las comisiones registradas no necesariamente han sido cobradas.</p>
  {all&&<details className="admin-panel closing-create-panel" open={!!preselect}><summary>Registrar venta o alquiler <span>+</span></summary>
   <form method="post" action="/api/admin/cierres" className="closing-create-form">
    <div className="closing-form-grid">
     <label>Prospecto y propiedad *<select name="leadId" defaultValue={preselect} required><option value="">Selecciona una consulta con propiedad</option>
      {leads.map(l=><option key={l.id} value={l.id}>{l.name} · {l.property?.refCode||"Sin referencia"} · {l.property?.title}</option>)}</select></label>
     <label>Tipo de operación *<select name="kind" defaultValue="venta" required><option value="venta">Venta</option><option value="alquiler">Alquiler</option></select></label>
     <label>Fecha de cierre *<input type="date" name="closedAt" max={today.toISOString().slice(0,10)} defaultValue={today.toISOString().slice(0,10)} required/></label>
     <label>Agente responsable<select name="agentId" defaultValue="auto"><option value="auto">Asignado al prospecto</option><option value="">Sin agente</option>
      {agents.filter(a=>a.active).map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</select></label>
     <label>Importe total (USD) *<input name="amount" type="number" min="0.01" max="99999999999.99" step="0.01" required placeholder="95000.00"/></label>
     <label>Comisión (USD) *<input name="commissionAmount" type="number" min="0" max="99999999999.99" step="0.01" required placeholder="2850.00"/></label>
    </div>
    <label>Observaciones<textarea name="notes" maxLength={2000} rows={3} placeholder="Número de contrato, observaciones internas o referencia de operación"/></label>
    <button className="btn btn-red" type="submit">Registrar cierre</button>
   </form>
   <p className="property-help">Cada prospecto puede tener un único cierre registrado. Si necesitas registrar otra operación, crea una consulta independiente. El estado comercial del CRM no cambia automáticamente.</p>
  </details>}
  <div className="admin-panel"><h2>Historial de operaciones</h2>
   <form className="closing-filters" method="get" action="/admin/cierres">
    <label>Período<select name="periodo" defaultValue={String(days)}><option value="7">7 días</option><option value="30">30 días</option><option value="90">90 días</option></select></label>
    <label>Operación<select name="tipo" defaultValue={kind}><option value="">Todas</option><option value="venta">Venta</option><option value="alquiler">Alquiler</option></select></label>
    <label>Estado<select name="estado" defaultValue={state}><option value="confirmado">Confirmados</option><option value="anulado">Anulados</option><option value="todos">Todos</option></select></label>
    {all&&<label>Agente<select name="agente" defaultValue={selected}><option value="">Todos</option>{agents.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</select></label>}
    <button className="btn wizard-back" type="submit">Filtrar</button>
   </form>
   {records.length?<div className="closing-records">{records.map(record=><article className={"closing-record"+(record.status==="anulado"?" closing-voided":"")} key={record.id}>
    <div className="closing-record-header"><span className="closing-kind">{record.kind==="venta"?"Venta":"Alquiler"}</span><strong>{record.propertyRefCode} · {record.clientName}</strong><span className="closing-record-date">{dt(record.closedAt)}</span>
     <span className="closing-record-status">{record.status==="anulado"?"Anulado":"Registrado"}</span>
    </div>
    <div className="closing-record-details"><span>Agente: <strong>{record.agentName}</strong></span>
     <span>Importe: <strong>{closingMoney(record.amount.toString())}</strong></span>
     <span>Comisión: <strong>{closingMoney(record.commissionAmount.toString())}</strong></span>
     {all&&<Link href={"/admin/leads/"+encodeURIComponent(record.leadId)} className="inline-link">Ver prospecto <ArrowUpRight size={14}/></Link>}
    </div>
    {record.status==="anulado"&&<p className="property-help">Anulado: {record.voidReason||"Sin motivo"}{record.voidedAt?" · "+dt(record.voidedAt):""}</p>}
    {admin&&record.status==="confirmado"&&<details className="closing-void-form"><summary><Undo2 size={14}/> Anular registro</summary>
     <form method="post" action={"/api/admin/cierres/"+encodeURIComponent(record.id)}>
      <input type="hidden" name="intent" value="void"/>
      <label>Motivo obligatorio<textarea name="reason" minLength={10} maxLength={1000} required placeholder="Explica por qué se anula esta operación."/></label>
      <button type="submit" className="btn wizard-back">Confirmar anulación</button>
     </form>
    </details>}
   </article>)}</div>:<p className="admin-empty">No hay operaciones registradas con estos filtros.</p>}
   {records.length===100&&<p className="property-help">Se muestran las primeras 100 operaciones. Exporta el CSV para consultar el período completo.</p>}
  </div>
  <p className="property-help">Los registros anulados se conservan con motivo, fecha y autor. Únicamente el administrador puede anularlos.</p>
 </section>;
}
