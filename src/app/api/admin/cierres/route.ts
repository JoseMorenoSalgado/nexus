import {NextRequest} from "next/server";
import {prisma} from "@/lib/prisma";
import {requireAdmin} from "@/lib/auth";
import {tenantModuleEnabled} from "@/lib/tenant-modules";
import {closingTableReady} from "@/lib/closing-schema";
import {decimalAmount,validClosedAt} from "@/lib/closing-utils";
import {parseRoles} from "@/lib/roles";
import {propertyRedirect,validMutationOrigin} from "@/lib/admin-property-request";
export const runtime="nodejs";
const back=(error:string)=>propertyRedirect("/admin/cierres?error="+encodeURIComponent(error));
export async function POST(req:NextRequest){
 const admin=await requireAdmin();
 if(!await tenantModuleEnabled(admin.tenantId,"closings"))return new Response("Módulo desactivado",{status:403});
 if(!admin.roles.some(r=>r==="admin"||r==="editor"))return back("permisos");
 if(!validMutationOrigin(req))return back("origen");
 const length=Number(req.headers.get("content-length")||0);
 if(!Number.isSafeInteger(length)||length>12000)return back("datos");
 if(!await closingTableReady())return back("inactivo");
 let form:FormData;
 try{form=await req.formData();}catch{return back("datos");}
 const value=(key:string,max:number)=>{
  const raw=form.get(key);return typeof raw==="string"&&raw.length<=max?raw.trim():null;
 };
 const leadId=value("leadId",100),kind=value("kind",20);
 const amount=decimalAmount(form.get("amount"));
 const commissionAmount=decimalAmount(form.get("commissionAmount"),true);
 const closedAt=validClosedAt(form.get("closedAt"));
 const notes=value("notes",2000);
 const agentChoice=value("agentId",100);
 if(!leadId||!["venta","alquiler"].includes(kind||"")||!amount||!commissionAmount||!closedAt||notes===null||agentChoice===null)return back("datos");
 if(Number(commissionAmount)>Number(amount))return back("comision");
 const lead=await prisma.lead.findFirst({
  where:{id:leadId,tenantId:admin.tenantId},
  select:{id:true,name:true,propertyId:true,assignedAgentId:true,
   property:{select:{id:true,tenantId:true,refCode:true,operation:true}}}
 });
 if(!lead||!lead.property||lead.property.tenantId!==admin.tenantId)return back("propiedad");
 const operation=lead.property.operation.toLowerCase();
 if(operation==="venta"&&kind!=="venta"||["alquiler","renta"].includes(operation)&&kind!=="alquiler")return back("operacion");
 let agentId:string|null=null,agentName="Sin agente";
 const selectedId=agentChoice==="auto"?lead.assignedAgentId:agentChoice||null;
 if(selectedId){
  const agent=await prisma.adminUser.findFirst({where:{id:selectedId,tenantId:admin.tenantId,active:true},
   select:{id:true,name:true,role:true}});
  if(!agent||!parseRoles(agent.role).includes("agente"))return back("agente");
  agentId=agent.id;agentName=agent.name;
 }
 try{
  const record=await prisma.commercialClosing.create({data:{
   tenantId:admin.tenantId,leadId:lead.id,propertyId:lead.property.id,
   agentId,agentName,propertyRefCode:lead.property.refCode,clientName:lead.name,
   kind:kind!,currency:"USD",amount,commissionAmount,closedAt,notes:notes||null,
   createdByName:admin.name.slice(0,120)
  },select:{id:true}});
  return propertyRedirect("/admin/cierres?created=1&cierre="+encodeURIComponent(record.id));
 }catch(error){
  if(error&&typeof error==="object"&&"code" in error&&error.code==="P2002")return back("duplicado");
  console.error("[closings] create failed",error instanceof Error?error.name:"unknown");
  return back("servidor");
 }
}
