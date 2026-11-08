import {notFound} from "next/navigation";
import {requireRole} from "@/lib/auth";
import {getStandalonePrisma} from "@/lib/prisma-standalone";
export const dynamic="force-dynamic";
const money=(n:unknown)=>Number(n||0).toLocaleString("es-NI",{style:"currency",currency:"USD"});
export default async function StandaloneClosings(){
 if(process.env.NEXUS_STANDALONE!=="true")notFound();
 const admin=await requireRole(["admin","editor","agente"]);
 const manager=admin.roles.includes("admin")||admin.roles.includes("editor");
 const db=getStandalonePrisma();
 const records=await db.commercialClosing.findMany({where:manager?{}:{agentId:admin.userId},orderBy:{closedAt:"desc"},take:100,select:{id:true,kind:true,status:true,clientName:true,agentName:true,propertyRefCode:true,amount:true,commissionAmount:true,closedAt:true}});
 const confirmed=records.filter(r=>r.status==="confirmado");
 return <section className="closing-dashboard">
  <div className="admin-heading"><div><h1>Cierres comerciales</h1><p>Ventas y alquileres registrados en PostgreSQL independiente.</p></div></div>
  <div className="closing-metrics"><div><span>Operaciones mostradas</span><strong>{records.length}{records.length===100?"+":""}</strong></div><div><span>Confirmadas</span><strong>{confirmed.length}</strong></div><div><span>Importe confirmado (muestra)</span><strong>{money(confirmed.reduce((s,r)=>s+Number(r.amount),0))}</strong></div><div><span>Comisiones confirmadas (muestra)</span><strong>{money(confirmed.reduce((s,r)=>s+Number(r.commissionAmount),0))}</strong></div></div>
  <section className="admin-panel"><h2>Registro de operaciones</h2><p>Consulta de solo lectura. La creación y anulación de cierres se habilitará después de validar las reglas financieras en la base independiente.</p>
   {records.length?<div className="agenda-event-list">{records.map(r=><article className="agenda-event" key={r.id}><div className="agenda-event-main"><strong>{r.propertyRefCode} · {r.clientName}</strong><p>{r.kind} · {r.status} · {r.agentName} · {r.closedAt.toISOString().slice(0,10)}</p><p>Importe: {money(r.amount)} · Comisión: {money(r.commissionAmount)}</p></div></article>)}</div>:<p>No hay cierres registrados.</p>}
  </section>
 </section>;
}
