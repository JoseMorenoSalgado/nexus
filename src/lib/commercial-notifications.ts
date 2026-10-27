import "server-only";
import {prisma} from "@/lib/prisma";
import {leadWhere,managesAllLeads,type AgentScope} from "@/lib/agent-scope";
import {agendaScope,agendaLabel} from "@/lib/agenda";
import {agendaTableReady} from "@/lib/agenda-schema";
import {crmTablesReady} from "@/lib/crm-schema";

export type NotificationCategory="vencidas"|"proximas"|"sin-atender"|"sin-asignar";
export type CommercialNotification={
 id:string;category:NotificationCategory;title:string;detail:string;date:string;href:string;
};
export type NotificationSnapshot={
 generatedAt:string;counts:Record<NotificationCategory,number>;total:number;
 items:CommercialNotification[];agendaReady:boolean;crmReady:boolean;
};
const categories:NotificationCategory[]=["vencidas","proximas","sin-atender","sin-asignar"];
export function notificationCategory(raw?:string):NotificationCategory|"todas"{
 return categories.includes(raw as NotificationCategory)?raw as NotificationCategory:"todas";
}
export const notificationCategoryNames:Record<NotificationCategory,string>={
 vencidas:"Vencidas",proximas:"Próximas", "sin-atender":"Prospectos sin atender",
 "sin-asignar":"Sin responsable"
};

/** All queries are tenant-scoped and agents can only see their own lead portfolio.
 * Notifications are actionable records, not a persisted read/unread status.
 * "Próximas" means within the next 24 hours, independent of server timezone.
 */
export async function commercialNotifications(user:AgentScope,{limit=16,category="todas"}:{
 limit?:number;category?:NotificationCategory|"todas";
}={}):Promise<NotificationSnapshot>{
 const cap=Math.max(0,Math.min(50,limit));
 const now=new Date(),in24=new Date(now.getTime()+24*3600_000);
 const since=new Date(now.getTime()-7*86400_000);
 const [agendaReady,crmReady]=await Promise.all([agendaTableReady(),crmTablesReady()]);
 const scope=agendaScope(user),leads=leadWhere(user);
 const counts:NotificationSnapshot["counts"]={
  vencidas:0,proximas:0,"sin-atender":0,"sin-asignar":0
 };
 const items:CommercialNotification[]=[];
 const canSee=(c:NotificationCategory)=>cap>0&&(category==="todas"||category===c);
 if(agendaReady){
  const common={...scope,status:"pendiente"};
  const [expired,soon,oldRows,newRows]=await Promise.all([
   prisma.agendaEvent.count({where:{...common,startsAt:{lt:now}}}),
   prisma.agendaEvent.count({where:{...common,startsAt:{gte:now,lt:in24}}}),
   canSee("vencidas")?prisma.agendaEvent.findMany({where:{...common,startsAt:{lt:now}},take:cap,orderBy:{startsAt:"desc"},
    select:{id:true,type:true,title:true,startsAt:true,lead:{select:{name:true}}}}):Promise.resolve([]),
   canSee("proximas")?prisma.agendaEvent.findMany({where:{...common,startsAt:{gte:now,lt:in24}},take:cap,orderBy:{startsAt:"asc"},
    select:{id:true,type:true,title:true,startsAt:true,lead:{select:{name:true}}}}):Promise.resolve([])
  ]);
  counts.vencidas+=expired;counts.proximas+=soon;
  for(const row of oldRows)items.push({
   id:"agenda-"+row.id,category:"vencidas",title:row.title,
   detail:agendaLabel(row.type)+" · "+row.lead.name,date:row.startsAt.toISOString(),
   href:"/admin/agenda?mes="+row.startsAt.toISOString().slice(0,7)+"#agenda-"+row.id
  });
  for(const row of newRows)items.push({
   id:"agenda-"+row.id,category:"proximas",title:row.title,
   detail:agendaLabel(row.type)+" · "+row.lead.name,date:row.startsAt.toISOString(),
   href:"/admin/agenda?mes="+row.startsAt.toISOString().slice(0,7)+"#agenda-"+row.id
  });
 }
 if(crmReady){
  const common={tenantId:user.tenantId,status:{notIn:["cerrado","descartado"]},
   lead:{is:leads}};
  const [lateCount,soonCount,late,soon]=await Promise.all([
   prisma.leadCrm.count({where:{...common,nextContactAt:{lt:now}}}),
   prisma.leadCrm.count({where:{...common,nextContactAt:{gte:now,lt:in24}}}),
   canSee("vencidas")?prisma.leadCrm.findMany({where:{...common,nextContactAt:{lt:now}},take:cap,
    orderBy:{nextContactAt:"desc"},select:{nextContactAt:true,lead:{select:{id:true,name:true}}}}):Promise.resolve([]),
   canSee("proximas")?prisma.leadCrm.findMany({where:{...common,nextContactAt:{gte:now,lt:in24}},take:cap,
    orderBy:{nextContactAt:"asc"},select:{nextContactAt:true,lead:{select:{id:true,name:true}}}}):Promise.resolve([])
  ]);
  counts.vencidas+=lateCount;counts.proximas+=soonCount;
  for(const row of late)if(row.nextContactAt)items.push({
   id:"crm-late-"+row.lead.id,category:"vencidas",title:"Seguimiento vencido",
   detail:row.lead.name,date:row.nextContactAt.toISOString(),
   href:"/admin/leads/"+encodeURIComponent(row.lead.id)
  });
  for(const row of soon)if(row.nextContactAt)items.push({
   id:"crm-soon-"+row.lead.id,category:"proximas",title:"Contactar al prospecto",
   detail:row.lead.name,date:row.nextContactAt.toISOString(),
   href:"/admin/leads/"+encodeURIComponent(row.lead.id)
  });
  const newScope={...leads,createdAt:{gte:since},
   OR:[{crm:{is:null}},{crm:{is:{status:"nuevo",tenantId:user.tenantId}}}]};
  const [newCount,newRows]=await Promise.all([
   prisma.lead.count({where:newScope}),
   canSee("sin-atender")?prisma.lead.findMany({where:newScope,orderBy:{createdAt:"desc"},take:cap,
    select:{id:true,name:true,createdAt:true,property:{select:{refCode:true}}}}):Promise.resolve([])
  ]);
  counts["sin-atender"]=newCount;
  for(const row of newRows)items.push({
   id:"new-"+row.id,category:"sin-atender",title:"Prospecto sin gestionar",
   detail:row.name+(row.property?.refCode?" · "+row.property.refCode:""),
   date:row.createdAt.toISOString(),href:"/admin/leads/"+encodeURIComponent(row.id)
  });
 }
 if(managesAllLeads(user)){
  const unassigned={tenantId:user.tenantId,assignedAgentId:null,createdAt:{gte:since}};
  const [count,rows]=await Promise.all([
   prisma.lead.count({where:unassigned}),
   canSee("sin-asignar")?prisma.lead.findMany({where:unassigned,orderBy:{createdAt:"desc"},take:cap,
    select:{id:true,name:true,createdAt:true}}):Promise.resolve([])
  ]);
  counts["sin-asignar"]=count;
  for(const row of rows)items.push({id:"unassigned-"+row.id,category:"sin-asignar",
   title:"Asignar responsable",detail:row.name,date:row.createdAt.toISOString(),
   href:"/admin/leads/"+encodeURIComponent(row.id)});
 }
 items.sort((a,b)=>{
  const priority=(c:NotificationCategory)=>({vencidas:0,proximas:1,"sin-atender":2,"sin-asignar":3})[c];
  return priority(a.category)-priority(b.category)||
   (a.category==="vencidas"?Date.parse(b.date)-Date.parse(a.date):
    a.category==="proximas"?Date.parse(a.date)-Date.parse(b.date):
    Date.parse(b.date)-Date.parse(a.date));
 });
 return {generatedAt:now.toISOString(),counts,total:Object.values(counts).reduce((n,c)=>n+c,0),
  items:items.slice(0,cap),agendaReady,crmReady};
}
