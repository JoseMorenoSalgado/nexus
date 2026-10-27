import "server-only";
import type {Prisma} from "@prisma/client";
import {managesAllLeads,type AgentScope} from "@/lib/agent-scope";

export type ClosingKind="venta"|"alquiler";
export const CLOSING_KINDS=[{value:"venta",label:"Venta"},{value:"alquiler",label:"Alquiler"}] as const;
export function closingWhere(user:AgentScope):Prisma.CommercialClosingWhereInput{
 return {tenantId:user.tenantId,...(!managesAllLeads(user)?{agentId:user.userId}:{})};
}
/** Canonical decimal string to avoid floating-point rounding in persisted money. */
export function decimalAmount(raw:FormDataEntryValue|null,allowZero=false):string|null{
 if(typeof raw!=="string"||!/^(?:0|[1-9]\d{0,10})(?:\.\d{1,2})?$/.test(raw))return null;
 const [whole,fraction=""]=raw.split(".");
 if(!allowZero&&whole==="0"&&!/[1-9]/.test(fraction))return null;
 return whole+"."+fraction.padEnd(2,"0");
}
export function validClosedAt(raw:FormDataEntryValue|null):Date|null{
 if(typeof raw!=="string"||!/^\d{4}-\d{2}-\d{2}$/.test(raw))return null;
 const date=new Date(raw+"T00:00:00.000Z");
 if(!Number.isFinite(date.getTime())||date.toISOString().slice(0,10)!==raw)return null;
 const today=new Date();today.setUTCHours(0,0,0,0);
 return date>today||date<new Date("2000-01-01T00:00:00.000Z")?null:date;
}
export const closingMoney=(raw:string|number)=>new Intl.NumberFormat("es-NI",{
 style:"currency",currency:"USD",minimumFractionDigits:2,maximumFractionDigits:2
}).format(Number(raw));
