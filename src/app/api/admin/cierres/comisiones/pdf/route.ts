import {NextRequest} from "next/server";
import {requireAdmin} from "@/lib/auth";
import {tenantModuleEnabled} from "@/lib/tenant-modules";
import {commissionTableReady} from "@/lib/commission-schema";
import {closingTableReady} from "@/lib/closing-schema";
import {commissionLedger} from "@/lib/commission-ledger";
import {closingMoney} from "@/lib/closing-utils";
import {renderCommercialPdf} from "@/lib/commercial-pdf";
import {managesAllLeads} from "@/lib/agent-scope";
import {prisma} from "@/lib/prisma";
export const runtime="nodejs";
export const dynamic="force-dynamic";
export async function GET(req:NextRequest){
 const user=await requireAdmin();
 if(!await tenantModuleEnabled(user.tenantId,"closings"))return new Response("Módulo desactivado",{status:403});
 if(!user.roles.some(r=>["admin","editor","agente"].includes(r)))return new Response("No autorizado",{status:403});
 if(!await closingTableReady()||!await commissionTableReady())return new Response("Comisiones no activadas",{status:503});
 const qs=new URL(req.url).searchParams;
 const period=qs.get("periodo")||"30";
 const status=qs.get("estado")||"";
 const requestedAgent=qs.get("agente")||"";
 let agentId:string|undefined;
 if(managesAllLeads(user)&&requestedAgent){
  if(requestedAgent.length>100)return new Response("Filtro inválido",{status:400});
  const agent=await prisma.adminUser.findFirst({where:{tenantId:user.tenantId,id:requestedAgent},select:{id:true}});
  if(!agent)return new Response("Agente no encontrado",{status:400});
  agentId=agent.id;
 }
 const report=await commissionLedger(user,{period,agentId,allPeriods:period==="todos",limit:1500});
 const filtered=report.rows.filter(r=>!status||r.paymentStatus===status);
 const pdf=await renderCommercialPdf({
  tenantName:user.tenantName,title:"Estado de comisiones",subtitle:"Pagos parciales y saldos por agente",
  period:period==="todos"?"Histórico completo":"Período: "+report.from+" al "+report.through+" (UTC)",
  metrics:[{label:"Comisión total",value:closingMoney(report.totals.commission)},
   {label:"Pagado",value:closingMoney(report.totals.paid)},
   {label:"Pendiente",value:closingMoney(report.totals.balance)},
   {label:"Operaciones",value:String(report.rows.filter(r=>r.status==="confirmado").length)}],
  columns:[{title:"Referencia / Cliente",width:157},{title:"Agente",width:95},
   {title:"Comisión",width:78},{title:"Pagado",width:68},{title:"Saldo",width:67},{title:"Estado",width:52.28}],
  rows:filtered.map(r=>[r.propertyRefCode+" / "+r.clientName,r.agentName,closingMoney(r.commission),
   closingMoney(r.paid),closingMoney(r.balance),r.paymentStatus]),
  note:"Registro interno. Abonos declarados; no constituye comprobante bancario."
 });
 return new Response(Buffer.from(pdf),{headers:{"Content-Type":"application/pdf",
  "Content-Disposition":'attachment; filename="comisiones-'+(period==="todos"?"historico":report.days+"-dias")+'.pdf"',
  "Cache-Control":"private, no-store","X-Content-Type-Options":"nosniff"}});
}
