import {NextRequest} from "next/server";
import {requireAdmin} from "@/lib/auth";
import {tenantModuleEnabled} from "@/lib/tenant-modules";
import {prisma} from "@/lib/prisma";
import {getStandalonePrisma} from "@/lib/prisma-standalone";
import {closingTableReady} from "@/lib/closing-schema";
import {closingWhere} from "@/lib/closing-utils";
import {resolveReportPeriod} from "@/lib/real-estate-reports";
import {managesAllLeads} from "@/lib/agent-scope";
export const runtime="nodejs";
export const dynamic="force-dynamic";
function cell(input:string){
 let value=input;
 // Prevent spreadsheet formula execution, including after leading whitespace.
 if(/^[\s\u0000-\u001f]*[=+\-@]/.test(value))value="'"+value;
 return '"'+value.replace(/"/g,'""')+'"';
}
export async function GET(req:NextRequest){
 const user=await requireAdmin();
 if(process.env.NEXUS_STANDALONE==="true"){
  if(!user.roles.some(r=>["admin","editor","agente"].includes(r)))return new Response("No autorizado",{status:403});
  const query=new URL(req.url).searchParams;
  const period=resolveReportPeriod(query.get("periodo")||undefined);
  const from=new Date();from.setUTCHours(0,0,0,0);from.setUTCDate(from.getUTCDate()-(period-1));
  const through=new Date();through.setUTCHours(0,0,0,0);through.setUTCDate(through.getUTCDate()+1);
  const manager=user.roles.some(r=>r==="admin"||r==="editor");
  const selected=manager?query.get("agente")||"":user.userId;
  if(selected.length>100)return new Response("Solicitud inválida",{status:400});
  const db=getStandalonePrisma();
  if(selected&&manager&&!await db.adminUser.findUnique({where:{id:selected},select:{id:true}}))return new Response("Agente no encontrado",{status:400});
  const data=await db.commercialClosing.findMany({where:{closedAt:{gte:from,lt:through},...(selected?{agentId:selected}:{})},orderBy:{closedAt:"desc"},take:10000,select:{kind:true,closedAt:true,clientName:true,propertyRefCode:true,agentName:true,amount:true,commissionAmount:true,currency:true,status:true,voidReason:true,createdByName:true,createdAt:true}});
  const lines=[["Reporte de operaciones inmobiliarias","Nexus Real Estate"],["Período",String(period)+" días"],[],["Operación","Fecha","Propiedad","Cliente","Agente","Moneda","Importe","Comisión","Estado","Motivo anulación","Registrado por","Fecha registro"],...data.map(row=>[row.kind,row.closedAt.toISOString().slice(0,10),row.propertyRefCode,row.clientName,row.agentName,row.currency,row.amount.toFixed(2),row.commissionAmount.toFixed(2),row.status,row.voidReason||"",row.createdByName,row.createdAt.toISOString().slice(0,10)])];
  const output="\uFEFF"+lines.map(line=>line.map(item=>cell(item)).join(",")).join("\r\n");
  return new Response(output,{headers:{"Content-Type":"text/csv; charset=utf-8","Content-Disposition":'attachment; filename="cierres-comerciales-'+period+'-dias.csv"',"Cache-Control":"private, no-store","X-Content-Type-Options":"nosniff"}});
 }

 if(!await tenantModuleEnabled(user.tenantId,"closings"))return new Response("Módulo desactivado",{status:403});
 if(!user.roles.some(r=>["admin","editor","agente"].includes(r)))return new Response("No autorizado",{status:403});
 if(!await closingTableReady())return new Response("Registro no activado",{status:503});
 const query=new URL(req.url).searchParams;
 const period=resolveReportPeriod(query.get("periodo")||undefined);
 const from=new Date();from.setUTCHours(0,0,0,0);from.setUTCDate(from.getUTCDate()-(period-1));
 const through=new Date();through.setUTCHours(0,0,0,0);through.setUTCDate(through.getUTCDate()+1);
 const selected=managesAllLeads(user)?query.get("agente")||"":user.userId;
 if(selected.length>100)return new Response("Solicitud inválida",{status:400});
 const where={...closingWhere(user),closedAt:{gte:from,lt:through},...(selected?{agentId:selected}:{})};
 const data=await prisma.commercialClosing.findMany({where,orderBy:{closedAt:"desc"},
  select:{kind:true,closedAt:true,clientName:true,propertyRefCode:true,agentName:true,amount:true,
   commissionAmount:true,currency:true,status:true,voidReason:true,createdByName:true,createdAt:true}});
 const lines=[
  ["Reporte de operaciones inmobiliarias",user.tenantName],
  ["Período",String(period)+" días"],[],
  ["Operación","Fecha","Propiedad","Cliente","Agente","Moneda","Importe","Comisión","Estado","Motivo anulación","Registrado por","Fecha registro"],
  ...data.map(c=>[c.kind,c.closedAt.toISOString().slice(0,10),c.propertyRefCode,c.clientName,c.agentName,c.currency,
   c.amount.toFixed(2),c.commissionAmount.toFixed(2),c.status,c.voidReason||"",c.createdByName,c.createdAt.toISOString().slice(0,10)])
 ];
 const output="\uFEFF"+lines.map(line=>line.map(item=>cell(item)).join(",")).join("\r\n");
 return new Response(output,{headers:{"Content-Type":"text/csv; charset=utf-8",
  "Content-Disposition":'attachment; filename="cierres-comerciales-'+period+'-dias.csv"',
  "Cache-Control":"private, no-store","X-Content-Type-Options":"nosniff"}});
}
