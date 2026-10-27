import "server-only";
import {prisma} from "@/lib/prisma";
import {closingWhere,type ClosingKind} from "@/lib/closing-utils";
import {type AgentScope} from "@/lib/agent-scope";
import {resolveReportPeriod} from "@/lib/real-estate-reports";

/** Integer cents throughout calculations. Persisting amounts remains Prisma Decimal. */
export function cents(raw:string):bigint{
 if(!/^-?\d+(?:\.\d{1,2})?$/.test(raw))throw Error("INVALID_DECIMAL");
 const negative=raw.startsWith("-");
 const clean=negative?raw.slice(1):raw;
 const [whole,part=""]=clean.split(".");
 const value=BigInt(whole)*BigInt(100)+BigInt(part.padEnd(2,"0"));
 return negative?-value:value;
}
export function money(value:bigint){return (value<BigInt(0)?"-":"")+(value<BigInt(0)?-value:value)/BigInt(100)+"."+String((value<BigInt(0)?-value:value)%BigInt(100)).padStart(2,"0");}
export function paymentStatus(due:bigint,paid:bigint){
 return due===BigInt(0)?"sin-comision":paid===BigInt(0)?"pendiente":paid>=due?"pagada":"parcial";
}
export type LedgerEntry={
 id:string;leadId:string;clientName:string;propertyRefCode:string;
 agentId:string|null;agentName:string;kind:string;currency:string;
 closedAt:Date;status:string;commission:string;paid:string;balance:string;
 paymentStatus:string;amount:string;
 payments:Array<{id:string;amount:string;paidAt:Date;method:string;reference:string|null;notes:string|null;
 status:string;voidReason:string|null;createdByName:string;voidedByName:string|null;voidedAt:Date|null}>;
};
export async function commissionLedger(user:AgentScope,{period="30",agentId,allPeriods=false,limit=150}:{
 period?:string;agentId?:string;allPeriods?:boolean;limit?:number;
}={}){
 const days=resolveReportPeriod(period);
 const from=new Date();from.setUTCHours(0,0,0,0);from.setUTCDate(from.getUTCDate()-(days-1));
 const tomorrow=new Date();tomorrow.setUTCHours(0,0,0,0);tomorrow.setUTCDate(tomorrow.getUTCDate()+1);
 const where={...closingWhere(user),...(agentId?{agentId}:{}),
  ...(allPeriods?{}:{closedAt:{gte:from,lt:tomorrow}})};
 const closings=await prisma.commercialClosing.findMany({where,
  orderBy:[{closedAt:"desc"},{id:"asc"}],take:Math.max(1,Math.min(2000,limit)),
  include:{commissionPayments:{orderBy:[{paidAt:"desc"},{createdAt:"desc"}]}}});
 let total=BigInt(0),paid=BigInt(0),voided=0;
 const rows:LedgerEntry[]=closings.map(c=>{
  const commission=cents(c.commissionAmount.toFixed(2));
  const received=c.commissionPayments.filter(p=>p.status==="confirmado")
   .reduce((sum,p)=>sum+cents(p.amount.toFixed(2)),BigInt(0));
  const active=c.status==="confirmado";
  if(active){total+=commission;paid+=received;}else voided++;
  return {id:c.id,leadId:c.leadId,clientName:c.clientName,propertyRefCode:c.propertyRefCode,
   agentId:c.agentId,agentName:c.agentName,kind:c.kind,currency:c.currency,
   closedAt:c.closedAt,status:c.status,commission:money(commission),paid:money(received),
   balance:money(active?(commission-received):BigInt(0)),paymentStatus:active?paymentStatus(commission,received):"anulada",
   amount:c.amount.toFixed(2),payments:c.commissionPayments.map(p=>({
    id:p.id,amount:p.amount.toFixed(2),paidAt:p.paidAt,method:p.method,
    reference:p.reference,notes:p.notes,status:p.status,voidReason:p.voidReason,
    createdByName:p.createdByName,voidedByName:p.voidedByName,voidedAt:p.voidedAt
   }))};
 });
 return {days,from:from.toISOString().slice(0,10),through:new Date().toISOString().slice(0,10),
  rows,totals:{commission:money(total),paid:money(paid),balance:money(total-paid),voided},
  capped:rows.length>=limit};
}
