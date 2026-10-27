import {NextRequest} from "next/server";
import {requireAdmin} from "@/lib/auth";
import {tenantModuleEnabled} from "@/lib/tenant-modules";
import {prisma} from "@/lib/prisma";
import {closingTableReady} from "@/lib/closing-schema";
import {closingWhere,closingMoney} from "@/lib/closing-utils";
import {managesAllLeads} from "@/lib/agent-scope";
import {resolveReportPeriod} from "@/lib/real-estate-reports";
import {renderCommercialPdf} from "@/lib/commercial-pdf";
export const runtime="nodejs";
export const dynamic="force-dynamic";
export async function GET(req:NextRequest){
 const user=await requireAdmin();
 if(!await tenantModuleEnabled(user.tenantId,"closings"))return new Response("Módulo desactivado",{status:403});
 if(!user.roles.some(r=>["admin","editor","agente"].includes(r)))return new Response("No autorizado",{status:403});
 if(!await closingTableReady())return new Response("Cierres no activados",{status:503});
 const qs=new URL(req.url).searchParams;
 const days=resolveReportPeriod(qs.get("periodo")||undefined);
 const requestedAgent=qs.get("agente")||"";
 let agentId:string|undefined;
 if(managesAllLeads(user)&&requestedAgent){
  if(requestedAgent.length>100)return new Response("Filtro inválido",{status:400});
  const agent=await prisma.adminUser.findFirst({where:{id:requestedAgent,tenantId:user.tenantId},select:{id:true}});
  if(!agent)return new Response("Agente no encontrado",{status:400});
  agentId=agent.id;
 }
 const from=new Date();from.setUTCHours(0,0,0,0);from.setUTCDate(from.getUTCDate()-(days-1));
 const through=new Date();through.setUTCHours(0,0,0,0);through.setUTCDate(through.getUTCDate()+1);
 const where={...closingWhere(user),...(agentId?{agentId}:{}),closedAt:{gte:from,lt:through}};
 const rows=await prisma.commercialClosing.findMany({where,orderBy:{closedAt:"desc"},take:1500,
  select:{kind:true,closedAt:true,clientName:true,propertyRefCode:true,agentName:true,amount:true,
   commissionAmount:true,status:true}});
 const active=rows.filter(r=>r.status==="confirmado");
 const amount=active.reduce((sum,r)=>sum+Number(r.amount),0);
 const commissions=active.reduce((sum,r)=>sum+Number(r.commissionAmount),0);
 const pdf=await renderCommercialPdf({
  tenantName:user.tenantName,title:"Reporte de operaciones",subtitle:"Ventas y alquileres registrados",
  period:"Período: "+from.toISOString().slice(0,10)+" al "+new Date(through.getTime()-1).toISOString().slice(0,10)+" (UTC)",
  metrics:[{label:"Ventas",value:String(active.filter(r=>r.kind==="venta").length)},
   {label:"Alquileres",value:String(active.filter(r=>r.kind==="alquiler").length)},
   {label:"Valor total",value:closingMoney(amount)},
   {label:"Comisiones",value:closingMoney(commissions)}],
  columns:[{title:"Fecha",width:63},{title:"Propiedad / Cliente",width:168},
   {title:"Agente",width:98},{title:"Importe",width:81},{title:"Comisión",width:75},{title:"Estado",width:32.28}],
  rows:rows.map(r=>[r.closedAt.toISOString().slice(0,10),r.propertyRefCode+" / "+r.clientName,r.agentName,
   closingMoney(r.amount.toString()),closingMoney(r.commissionAmount.toString()),r.status==="confirmado"?"OK":"Anulado"]),
  note:"Operaciones declaradas por personal autorizado; no sustituye recibos o escrituras."
 });
 return new Response(Buffer.from(pdf),{headers:{"Content-Type":"application/pdf",
  "Content-Disposition":'attachment; filename="reporte-operaciones-'+days+'-dias.pdf"',
  "Cache-Control":"private, no-store","X-Content-Type-Options":"nosniff"}});
}
