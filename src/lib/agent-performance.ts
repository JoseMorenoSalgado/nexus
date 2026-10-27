import "server-only";
import {prisma} from "@/lib/prisma";
import {crmTablesReady} from "@/lib/crm-schema";
import {parseRoles} from "@/lib/roles";
import {resolveReportPeriod,type ReportPeriod} from "@/lib/real-estate-reports";
import {CRM_STATUSES,type CrmStatus} from "@/lib/crm-status";

type StageTotals=Record<CrmStatus,number>;
export type AgentPerformanceRow={
 id:string;name:string;email:string;active:boolean;properties:number;leads:number;
 stages:StageTotals;overdue:number;upcoming:number;conversion:number|null;
};
export type AgentPerformanceReport={
 days:ReportPeriod;from:string;through:string;asOf:string;crmActive:boolean;
 agents:AgentPerformanceRow[];unassigned:number;totalLeads:number;
 totals:{properties:number;leads:number;closed:number;visits:number;overdue:number;upcoming:number};
};
const emptyStages=():StageTotals=>Object.fromEntries(CRM_STATUSES.map(stage=>[stage.value,0])) as StageTotals;

/** The period filters leads by creation date. Stages and assignments represent their current state;
 * follow-up workload is current regardless of when a lead was first received.
 * This is not a historical conversion-event or completed-visit report.
 */
export async function generateAgentPerformance(tenantId:string,periodRaw:string|undefined,agentId?:string):Promise<AgentPerformanceReport>{
 const days=resolveReportPeriod(periodRaw);
 const now=new Date();
 const from=new Date(now);
 from.setUTCHours(0,0,0,0);
 from.setUTCDate(from.getUTCDate()-(days-1));
 const crmActive=await crmTablesReady();
 const users=await prisma.adminUser.findMany({
  where:{tenantId,...(agentId?{id:agentId}:{})},
  select:{id:true,name:true,email:true,role:true,active:true},orderBy:{name:"asc"}
 });
 const agents=users.filter(u=>parseRoles(u.role).includes("agente"));
 const ids=agents.map(a=>a.id);
 const rows=new Map<string,AgentPerformanceRow>(agents.map(a=>[a.id,{
  id:a.id,name:a.name,email:a.email,active:a.active,properties:0,leads:0,
  stages:emptyStages(),overdue:0,upcoming:0,conversion:null
 }]));
 const scope={tenantId,createdAt:{gte:from,lte:now}};
 const [propertyCounts,leadCounts,stageRows,followupRows,unassigned]=await Promise.all([
  ids.length?prisma.property.groupBy({by:["assignedAgentId"],where:{tenantId,assignedAgentId:{in:ids}},_count:{_all:true}}):Promise.resolve([]),
  ids.length?prisma.lead.groupBy({by:["assignedAgentId"],where:{...scope,assignedAgentId:{in:ids}},_count:{_all:true}}):Promise.resolve([]),
  ids.length&&crmActive?prisma.leadCrm.findMany({where:{tenantId,lead:{tenantId,assignedAgentId:{in:ids},createdAt:{gte:from,lte:now}}},
   select:{status:true,lead:{select:{assignedAgentId:true}}}}):Promise.resolve([]),
  ids.length&&crmActive?prisma.leadCrm.findMany({where:{tenantId,status:{notIn:["cerrado","descartado"]},
   nextContactAt:{not:null},lead:{tenantId,assignedAgentId:{in:ids}}},
   select:{nextContactAt:true,lead:{select:{assignedAgentId:true}}}}):Promise.resolve([]),
  agentId?Promise.resolve(0):prisma.lead.count({where:{...scope,assignedAgentId:null}})
 ]);
 for(const entry of propertyCounts){if(entry.assignedAgentId){const row=rows.get(entry.assignedAgentId);if(row)row.properties=entry._count._all;}}
 for(const entry of leadCounts){if(entry.assignedAgentId){const row=rows.get(entry.assignedAgentId);if(row)row.leads=entry._count._all;}}
 for(const stage of stageRows){
  const id=stage.lead.assignedAgentId;
  if(!id||!rows.has(id))continue;
  const row=rows.get(id)!;
  if(CRM_STATUSES.some(s=>s.value===stage.status)){
   row.stages[stage.status as CrmStatus]++;
  }
 }
 const until=new Date(now.getTime()+7*864e5);
 for(const followup of followupRows){
  const id=followup.lead.assignedAgentId;
  if(!id||!followup.nextContactAt)continue;
  const row=rows.get(id);
  if(!row)continue;
  if(followup.nextContactAt<now)row.overdue++;
  else if(followup.nextContactAt<until)row.upcoming++;
 }
 const totals={properties:0,leads:0,closed:0,visits:0,overdue:0,upcoming:0};
 for(const row of rows.values()){
  const knownNonNew=CRM_STATUSES.filter(s=>s.value!=="nuevo").reduce((sum,s)=>sum+row.stages[s.value],0);
  row.stages.nuevo=Math.max(0,row.leads-knownNonNew);
  row.conversion=crmActive&&row.leads?Math.round(row.stages.cerrado/row.leads*1000)/10:null;
  totals.properties+=row.properties;totals.leads+=row.leads;
  totals.closed+=row.stages.cerrado;totals.visits+=row.stages.visita;
  totals.overdue+=row.overdue;totals.upcoming+=row.upcoming;
 }
 return {days,from:from.toISOString().slice(0,10),through:now.toISOString().slice(0,10),
  asOf:now.toISOString(),crmActive,agents:[...rows.values()],unassigned,totalLeads:totals.leads+unassigned,totals};
}
