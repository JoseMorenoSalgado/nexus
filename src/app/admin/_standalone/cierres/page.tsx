import {notFound} from "next/navigation";
import CreateClosingForm from "./create-form";
import VoidClosingForm from "./void-form";
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
 const leads=manager?await db.lead.findMany({where:{propertyId:{not:null},closing:{is:null}},select:{id:true,name:true,property:{select:{refCode:true,operation:true}}},orderBy:{createdAt:"desc"},take:200}):[];
 const eligible=leads.filter(l=>l.property).map(l=>({id:l.id,name:l.name,ref:l.property!.refCode,operation:l.property!.operation}));
 return <section className="closing-dashboard">
  <div className="admin-heading"><div><h1>Cierres comerciales</h1><p>Ventas y alquileres registrados en PostgreSQL independiente.</p></div></div>
  <div className="closing-metrics"><div><span>Operaciones mostradas</span><strong>{records.length}{records.length===100?"+":""}</strong></div><div><span>Confirmadas</span><strong>{confirmed.length}</strong></div><div><span>Importe confirmado (muestra)</span><strong>{money(confirmed.reduce((s,r)=>s+Number(r.amount),0))}</strong></div><div><span>Comisiones confirmadas (muestra)</span><strong>{money(confirmed.reduce((s,r)=>s+Number(r.commissionAmount),0))}</strong></div></div>
  {manager&&<CreateClosingForm leads={eligible}/>}
  <section className="admin-panel"><h2>Registro de operaciones</h2><p>Los administradores pueden anular cierres sin pagos confirmados. Los pagos de comisiones permanecen pendientes de validación.</p>
   {records.length?<div className="agenda-event-list">{records.map(r=><article className="agenda-event" key={r.id}><div className="agenda-event-main"><strong>{r.propertyRefCode} · {r.clientName}</strong><p>{r.kind} · {r.status} · {r.agentName} · {r.closedAt.toISOString().slice(0,10)}</p><p>Importe: {money(r.amount)} · Comisión: {money(r.commissionAmount)}</p>{admin.roles.includes("admin")&&r.status==="confirmado"&&<VoidClosingForm id={r.id}/>}</div></article>)}</div>:<p>No hay cierres registrados.</p>}
  </section>
 </section>;
}
