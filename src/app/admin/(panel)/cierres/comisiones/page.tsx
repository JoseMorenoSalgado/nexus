import Link from "next/link";
import {Banknote,FileText,HandCoins,ShieldCheck,Wallet,ArrowLeft,AlertCircle} from "lucide-react";
import {requireRole} from "@/lib/auth";
import {prisma} from "@/lib/prisma";
import {closingTableReady} from "@/lib/closing-schema";
import {commissionTableReady} from "@/lib/commission-schema";
import {commissionLedger} from "@/lib/commission-ledger";
import {closingMoney} from "@/lib/closing-utils";
import {managesAllLeads} from "@/lib/agent-scope";
import {parseRoles} from "@/lib/roles";
export const dynamic="force-dynamic";
const errors:Record<string,string>={
 permisos:"No tienes permisos para registrar o anular abonos.",
 origen:"Origen inválido. Recarga la página.",respaldo:"Debes confirmar que existe una copia de seguridad.",
 inactivo:"Activa el registro de comisiones.", "sin-cierres":"Activa primero el registro de operaciones comerciales.",
 datos:"Revisa los datos del abono.",saldo:"El abono supera el saldo pendiente de la comisión.",
 fecha:"La fecha del pago no puede ser anterior a la operación.",
 noexiste:"No existe la operación o el abono ya ha sido anulado.",
 motivo:"La anulación necesita un motivo de al menos 10 caracteres.",
 servidor:"No se pudo completar la operación. Consulta los registros del servidor."
};
const date=(d:Date)=>d.toISOString().slice(0,10);
export default async function Commissions({searchParams}:{searchParams:Promise<{
 periodo?:string;agente?:string;estado?:string;activated?:string;created?:string;voided?:string;error?:string;
}>}){
 const user=await requireRole(["admin","editor","agente"]),q=await searchParams;
 const all=managesAllLeads(user),admin=user.roles.includes("admin");
 if(!await closingTableReady())return <section className="admin-panel">
  <h1>Comisiones por agente</h1><p>Debes activar primero el registro de ventas y alquileres.</p>
  <Link href="/admin/cierres" className="inline-link">Abrir operaciones →</Link>
 </section>;
 if(!await commissionTableReady())return <section className="commission-dashboard">
  <div className="admin-heading"><div><h1>Comisiones y abonos</h1><p>Control de comisiones pagadas, parciales y pendientes.</p></div></div>
  <div className="admin-panel"><h2>Activar control de abonos</h2><p>La activación añade una tabla independiente. No cambia los importes ni las operaciones ya registradas.</p>
  {q.error&&<p role="alert" className="admin-error">{errors[q.error]||errors.servidor}</p>}
  {admin?<form className="closing-activation-form" method="post" action="/api/admin/comisiones/activate">
   <label><input type="checkbox" name="backupConfirmed" value="yes" required/> Confirmo que existe un respaldo verificable y recuperable de la base de datos.</label>
   <button className="btn btn-red" type="submit"><ShieldCheck size={16}/> Activar control de comisiones</button>
  </form>:<p className="property-help">Solicita al administrador que active esta función.</p>}</div>
 </section>;
 const agents=all?await prisma.adminUser.findMany({where:{tenantId:user.tenantId},
  select:{id:true,name:true,role:true},orderBy:{name:"asc"}}):[];
 const team=agents.filter(a=>parseRoles(a.role).includes("agente"));
 const selected=all&&team.some(a=>a.id===q.agente)?q.agente:"";
 const period=q.periodo==="todos"?"todos":q.periodo||"30";
 const status=["pendiente","parcial","pagada","sin-comision","anulada"].includes(q.estado||"")?q.estado:"";
 const report=await commissionLedger(user,{period,agentId:selected||undefined,allPeriods:period==="todos",limit:500});
 const filtered=report.rows.filter(row=>!status||row.paymentStatus===status);
 const total=closingMoney(report.totals.commission),paid=closingMoney(report.totals.paid),
  balance=closingMoney(report.totals.balance);
 const params=new URLSearchParams({periodo:period,agente:selected||"",estado:status||""});
 return <section className="commission-dashboard">
  <div className="admin-heading"><div><Link href="/admin/cierres" className="inline-link"><ArrowLeft size={16}/> Ventas y alquileres</Link>
   <h1>Comisiones por agente</h1><p>Seguimiento de abonos y saldos pendientes, con historial auditable.</p></div>
   <Link className="btn wizard-back" href={"/api/admin/cierres/comisiones/pdf?"+params.toString()}><FileText size={16}/> Descargar PDF</Link>
  </div>
  {(q.created||q.voided||q.activated)&&<p className="property-success" role="status">
   {q.created?"Abono registrado correctamente.":q.voided?"Abono anulado y conservado en el historial.":"Control de comisiones activado."}</p>}
  {q.error&&<p className="admin-error" role="alert">{errors[q.error]||errors.servidor}</p>}
  <div className="commission-metrics">
   <div><HandCoins size={20}/><span>Comisiones registradas</span><strong>{total}</strong></div>
   <div><Banknote size={20}/><span>Abonos confirmados</span><strong>{paid}</strong></div>
   <div><Wallet size={20}/><span>Saldo por pagar</span><strong>{balance}</strong></div>
  </div>
  <p className="property-help">Solo se suman operaciones vigentes y abonos no anulados. Son pagos registrados manualmente, no comprobantes bancarios. El período corresponde a la fecha de cierre, no a la fecha del abono.</p>
  <section className="admin-panel">
   <h2>Filtrar comisiones</h2>
   <form method="get" action="/admin/cierres/comisiones" className="commission-filters">
    <label>Operaciones de<select name="periodo" defaultValue={period}><option value="7">Últimos 7 días</option><option value="30">Últimos 30 días</option><option value="90">Últimos 90 días</option><option value="todos">Todo el historial</option></select></label>
    <label>Estado<select name="estado" defaultValue={status||""}><option value="">Todos</option><option value="pendiente">Pendientes</option><option value="parcial">Abono parcial</option><option value="pagada">Pagadas</option><option value="sin-comision">Sin comisión</option><option value="anulada">Operación anulada</option></select></label>
    {all&&<label>Agente<select name="agente" defaultValue={selected||""}><option value="">Todos los agentes</option>{team.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</select></label>}
    <button className="btn wizard-back" type="submit">Aplicar</button>
   </form>
   <div className="commission-records">
    {filtered.length?filtered.map(row=><article className="commission-record" key={row.id}>
     <div className="commission-record-top"><strong>{row.propertyRefCode} · {row.clientName}</strong>
      <span className={"commission-state commission-"+row.paymentStatus}>{row.paymentStatus==="pagada"?"Pagada":row.paymentStatus==="parcial"?"Pago parcial":row.paymentStatus==="pendiente"?"Pendiente":row.paymentStatus==="anulada"?"Anulada":"Sin comisión"}</span></div>
     <p>{row.agentName} · {row.kind==="venta"?"Venta":"Alquiler"} · {date(row.closedAt)}</p>
     <div className="commission-values"><span>Comisión: <strong>{closingMoney(row.commission)}</strong></span>
      <span>Abonado: <strong>{closingMoney(row.paid)}</strong></span>
      <span>Pendiente: <strong>{closingMoney(row.balance)}</strong></span></div>
     {admin&&row.status==="confirmado"&&row.paymentStatus!=="pagada"&&row.paymentStatus!=="sin-comision"&&<details className="commission-add-payment"><summary>Registrar abono +</summary>
      <form action="/api/admin/comisiones" method="post">
       <input name="closingId" type="hidden" value={row.id}/>
       <label>Importe (USD)<input type="number" min="0.01" max={row.balance} step="0.01" name="amount" required/></label>
       <label>Fecha de pago<input type="date" name="paidAt" max={new Date().toISOString().slice(0,10)} defaultValue={new Date().toISOString().slice(0,10)} required/></label>
       <label>Método<select name="method"><option value="transferencia">Transferencia</option><option value="efectivo">Efectivo</option><option value="cheque">Cheque</option><option value="otro">Otro</option></select></label>
       <label>Referencia<input type="text" name="reference" maxLength={120} placeholder="Número de transferencia o comprobante"/></label>
       <label>Observaciones<textarea name="notes" maxLength={1000} rows={2}/></label>
       <button className="btn btn-red" type="submit">Guardar abono</button>
      </form>
     </details>}
     {row.payments.length>0&&<details className="commission-payment-history"><summary>Historial de abonos ({row.payments.length})</summary>
      {row.payments.map(payment=><div key={payment.id} className={"commission-payment"+(payment.status==="anulado"?" commission-payment-voided":"")}>
       <strong>{date(payment.paidAt)} · {closingMoney(payment.amount)}</strong>
       <span>{payment.method} {payment.reference?"· "+payment.reference:""} {payment.status==="anulado"?"· Anulado":""}</span>
       <small>Registrado por {payment.createdByName}{payment.notes?" · "+payment.notes:""}</small>
       {payment.voidReason&&<small>Anulado: {payment.voidReason} ({payment.voidedByName})</small>}
       {admin&&payment.status==="confirmado"&&<details className="commission-void-payment"><summary>Anular abono</summary>
        <form method="post" action={"/api/admin/comisiones/"+encodeURIComponent(payment.id)}>
         <input type="hidden" name="intent" value="void"/>
         <label>Motivo de corrección<textarea name="reason" minLength={10} maxLength={1000} required/></label>
         <button className="btn wizard-back" type="submit">Anular y conservar historial</button>
        </form>
       </details>}
      </div>)}
     </details>}
    </article>):<p className="admin-empty">No hay comisiones con estos filtros.</p>}
   </div>
   {report.capped&&<p className="property-help"><AlertCircle size={15}/> Se muestran hasta 500 registros. Acota el período para consultar otros cierres.</p>}
  </section>
 </section>;
}
