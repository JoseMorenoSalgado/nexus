import "server-only";
import type {Prisma} from "@prisma/client";
import {leadWhere,type AgentScope} from "@/lib/agent-scope";
import {AGENDA_TYPES,AGENDA_STATUSES,type AgendaType,type AgendaStatus} from "@/lib/agenda-constants";
export {AGENDA_TYPES,AGENDA_STATUSES,AGENDA_DURATIONS} from "@/lib/agenda-constants";

export function isAgendaType(v:string):v is AgendaType{return AGENDA_TYPES.some(t=>t.value===v);}
export function isAgendaStatus(v:string):v is AgendaStatus{return AGENDA_STATUSES.some(t=>t.value===v);}
export function agendaScope(user:AgentScope):Prisma.AgendaEventWhereInput{
 return {tenantId:user.tenantId,lead:{is:leadWhere(user)}};
}
export function parseAgendaStartsAt(raw:FormDataEntryValue|null):Date|null{
 if(typeof raw!=="string"||!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(raw))return null;
 const date=new Date(raw);
 if(!Number.isFinite(date.getTime())||date.toISOString()!==raw)return null;
 if(date.getTime()<Date.now()-365*864e5||date.getTime()>Date.now()+730*864e5)return null;
 return date;
}
export function agendaLabel(value:string){
 return AGENDA_TYPES.find(t=>t.value===value)?.label||"Actividad";
}
export function agendaStatusLabel(value:string){
 return AGENDA_STATUSES.find(s=>s.value===value)?.label||value;
}

/** HTTPS-only user-provided meeting link. Never fetched by the server. */
export function parseMeetingUrl(raw:FormDataEntryValue|null):string|null|false{
 if(raw===null||raw==="")return null;
 if(typeof raw!=="string"||raw.length>500)return false;
 try{
  const url=new URL(raw.trim());
  if(url.protocol!=="https:"||!!url.username||!!url.password||!url.hostname||
     url.href.length>500)return false;
  return url.href;
 }catch{return false;}
}
