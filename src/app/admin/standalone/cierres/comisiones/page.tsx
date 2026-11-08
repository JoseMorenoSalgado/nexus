import {notFound} from "next/navigation";
import PaymentForm from "./payment-form";
import {requireRole} from "@/lib/auth";
import {getStandalonePrisma} from "@/lib/prisma-standalone";
export const dynamic="force-dynamic";
const money=(n:unknown)=>Number(n||0).toLocaleString("es-NI",{style:"currency",currency:"USD"});
export default async function StandaloneCommissions(){
 if(process.env.NEXUS_STANDALONE!=="true")notFound();
 const admin=await requireRole(["admin","editor","agente"]);
 const manager=admin.roles.includes("admin")||admin.roles.includes("editor");
 const db=getStandalonePrisma();
 const closings=await db.commercialClosing.findMany({where:manager?{}:{agentId:admin.userId},orderBy:{closedAt:"desc"},take:100,select:{id:true,agentName:true,propertyRefCode:true,commissionAmount:true,status:true,commissionPayments:{select:{amount:true,status:true,paidAt:true}}}});
 return <section className="commission-dashboard"><div className="admin-heading"><div><h1>Comisiones y abonos</h1><p>Control financiero independiente por operación y agente.</p></div></div>
 {admin.roles.includes("admin")&&<PaymentForm closings={closings.filter(c=>c.status==="confirmado"&&c.commissionPayments.filter(p=>p.status==="confirmado").reduce((s,p)=>s+Number(p.amount),0)<Number(c.commissionAmount)).map(c=>({id:c.id,label:c.propertyRefCode+" · "+c.agentName}))}/>}
 <section className="admin-panel"><h2>Estado de comisiones</h2><p>Los pagos confirmados se descuentan de la comisión; los anulados no se contabilizan.</p>
 {closings.length?<div className="agenda-event-list">{closings.map(c=>{const paid=c.commissionPayments.filter(p=>p.status==="confirmado").reduce((s,p)=>s+Number(p.amount),0);const commission=c.status==="confirmado"?Number(c.commissionAmount):0;return <article className="agenda-event" key={c.id}><div className="agenda-event-main"><strong>{c.propertyRefCode} · {c.agentName}</strong><p>Comisión: {money(commission)} · Abonado: {money(paid)} · Pendiente: {money(Math.max(0,commission-paid))}</p>{c.status!=="confirmado"&&<p>Operación {c.status}; no genera comisión vigente.</p>}</div></article>;})}</div>:<p>No hay comisiones registradas.</p>}
 </section></section>;
}
