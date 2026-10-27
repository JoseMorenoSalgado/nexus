import "server-only";
import {prisma} from "@/lib/prisma";
import {crmTablesReady} from "@/lib/crm-schema";
import {CRM_STATUSES} from "@/lib/crm-status";

export type ReportPeriod=7|30|90;
export function resolveReportPeriod(raw:string|undefined):ReportPeriod{
 return raw==="7"?7:raw==="90"?90:30;
}
export type PropertyReport={
 id:string;slug:string;refCode:string;title:string;city:string;published:boolean;
 views:number;whatsapp:number;webLeads:number;otherLeads:number;closed:number;
};
export type Report={
 days:ReportPeriod;from:string;through:string;views:number;detailViews:number;whatsapp:number;
 webLeads:number;otherLeads:number;leads:number;closed:number;overdue:number;
 crmActive:boolean;generalLeads:number;formRatio:number|null;closedRatio:number|null;
 sources:Array<{name:string;count:number}>;statuses:Array<{name:string;count:number}>;
 properties:PropertyReport[];
};
export async function generateReport(tenantId:string,days:ReportPeriod):Promise<Report>{
 const now=new Date(),from=new Date(now);
 from.setUTCHours(0,0,0,0);from.setUTCDate(from.getUTCDate()-(days-1));
 const crmActive=await crmTablesReady();
 const [properties,pathEvents,leadSources,crmStages,overdue,closedWithProperty]=await Promise.all([
  prisma.property.findMany({where:{tenantId},select:{id:true,slug:true,refCode:true,title:true,city:true,published:true}}),
  prisma.visitEvent.groupBy({by:["kind","path"],where:{tenantId,createdAt:{gte:from,lte:now}},_count:{_all:true}}),
  prisma.lead.groupBy({by:["source","propertyId"],where:{tenantId,createdAt:{gte:from,lte:now}},_count:{_all:true}}),
  crmActive?prisma.leadCrm.groupBy({by:["status"],where:{tenantId,lead:{tenantId,createdAt:{gte:from,lte:now}}},_count:{_all:true}}):Promise.resolve([]),
  crmActive?prisma.leadCrm.count({where:{tenantId,status:{notIn:["cerrado","descartado"]},nextContactAt:{lt:now}}}):Promise.resolve(0),
  crmActive?prisma.leadCrm.findMany({
   where:{tenantId,status:"cerrado",lead:{tenantId,createdAt:{gte:from,lte:now}}},
   select:{lead:{select:{propertyId:true}}}
  }):Promise.resolve([])
 ]);
 let views=0,whatsapp=0,detailViews=0;
 const pathMetrics=new Map<string,{views:number;whatsapp:number}>();
 for(const event of pathEvents){
  const count=event._count._all;
  if(event.kind==="view")views+=count;
  else if(event.kind==="whatsapp")whatsapp+=count;
  const path=event.path||"";
  if(!path.startsWith("/propiedades/"))continue;
  const remainder=path.slice("/propiedades/".length).replace(/\/+$/,"");
  if(!remainder||remainder.includes("/"))continue;
  let slug=remainder;try{slug=decodeURIComponent(remainder);}catch{continue;}
  const metrics=pathMetrics.get(slug)||{views:0,whatsapp:0};
  if(event.kind==="view"){metrics.views+=count;detailViews+=count;}
  else if(event.kind==="whatsapp")metrics.whatsapp+=count;
  pathMetrics.set(slug,metrics);
 }
 const propertyLeads=new Map<string,{web:number;other:number}>();
 const sourceMap=new Map<string,number>();
 let webLeads=0,otherLeads=0,generalLeads=0;
 for(const source of leadSources){
  const amount=source._count._all;
  sourceMap.set(source.source,(sourceMap.get(source.source)||0)+amount);
  if(source.source==="web")webLeads+=amount;else otherLeads+=amount;
  if(!source.propertyId){generalLeads+=amount;continue;}
  const counts=propertyLeads.get(source.propertyId)||{web:0,other:0};
  if(source.source==="web")counts.web+=amount;else counts.other+=amount;
  propertyLeads.set(source.propertyId,counts);
 }
 const closedByProperty=new Map<string,number>();
 for(const row of closedWithProperty){
  const id=row.lead.propertyId;
  if(id)closedByProperty.set(id,(closedByProperty.get(id)||0)+1);
 }
 const total=webLeads+otherLeads;
 const counts=new Map(crmStages.map(s=>[s.status,s._count._all]));
 const closed=counts.get("cerrado")||0;
 const statuses=CRM_STATUSES.map(s=>({name:s.label,count:s.value==="nuevo"
  ?Math.max(0,total-crmStages.filter(x=>x.status!=="nuevo").reduce((sum,x)=>sum+x._count._all,0))
  :counts.get(s.value)||0}));
 const propertyRows=properties.map(p=>{
  const m=pathMetrics.get(p.slug)||{views:0,whatsapp:0};
  const l=propertyLeads.get(p.id)||{web:0,other:0};
  return {...p,views:m.views,whatsapp:m.whatsapp,webLeads:l.web,otherLeads:l.other,closed:closedByProperty.get(p.id)||0};
 });
 propertyRows.sort((a,b)=>(b.webLeads+b.otherLeads)-(a.webLeads+a.otherLeads)
  ||b.whatsapp-a.whatsapp||b.views-a.views||a.refCode.localeCompare(b.refCode));
 return {
  days,from:from.toISOString().slice(0,10),through:now.toISOString().slice(0,10),
  views,detailViews,whatsapp,webLeads,otherLeads,leads:total,closed,overdue,
  crmActive,generalLeads,
  formRatio:detailViews?Math.round(1000*webLeads/detailViews)/10:null,
  closedRatio:crmActive&&total?Math.round(1000*closed/total)/10:null,
  sources:[...sourceMap].map(([name,count])=>({name,count})).sort((a,b)=>b.count-a.count),
  statuses,properties:propertyRows
 };
}
