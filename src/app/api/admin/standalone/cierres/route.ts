import {NextRequest,NextResponse} from "next/server";
import {currentAdmin} from "@/lib/auth";
import {getStandalonePrisma} from "@/lib/prisma-standalone";
import {validMutationOrigin} from "@/lib/admin-property-request";
export const runtime="nodejs";
export const dynamic="force-dynamic";
const fail=(error:string,status:number)=>NextResponse.json({error},{status,headers:{"Cache-Control":"no-store"}});
const money=(v:unknown,allowZero=false)=>{
 if(typeof v!=="string"||!/^(?:0|[1-9]\d{0,10})(?:\.\d{1,2})?$/.test(v))return null;
 const [a,b=""]=v.split(".");const out=a+"."+b.padEnd(2,"0");
 return !allowZero&&Number(out)===0?null:out;
};
export async function POST(req:NextRequest){
 if(process.env.NEXUS_STANDALONE!=="true")return fail("No disponible",404);
 const admin=await currentAdmin();
 if(!admin||!admin.roles.some(r=>r==="admin"||r==="editor"))return fail("No autorizado",403);
 if(!validMutationOrigin(req))return fail("Origen no permitido",403);
 const length=Number(req.headers.get("content-length")||0);
 if(!Number.isSafeInteger(length)||length>12000)return fail("Solicitud demasiado grande",413);
 let form:FormData;
 try{form=await req.formData();}catch{return fail("Datos inválidos",400);}
 const value=(key:string,max:number)=>{const raw=form.get(key);return typeof raw==="string"&&raw.length<=max?raw.trim():null;};
 const leadId=value("leadId",100),kind=value("kind",20),amount=money(form.get("amount")),commissionAmount=money(form.get("commissionAmount"),true),closed=value("closedAt",10),notes=value("notes",2000),agentChoice=value("agentId",100);
 if(!leadId||!["venta","alquiler"].includes(kind||"")||!amount||!commissionAmount||notes===null||agentChoice===null||!closed||!/^\d{4}-\d{2}-\d{2}$/.test(closed))return fail("Datos inválidos",400);
 const closedAt=new Date(closed+"T00:00:00.000Z");
 const today=new Date();today.setUTCHours(0,0,0,0);
 if(!Number.isFinite(closedAt.getTime())||closedAt.toISOString().slice(0,10)!==closed||closedAt>today||closedAt<new Date("2000-01-01"))return fail("Fecha inválida",400);
 if(Number(commissionAmount)>Number(amount))return fail("Comisión superior al importe",400);
 const db=getStandalonePrisma();
 const lead=await db.lead.findUnique({where:{id:leadId},select:{id:true,name:true,assignedAgentId:true,property:{select:{id:true,refCode:true,operation:true}}}});
 if(!lead?.property)return fail("Prospecto sin propiedad",404);
 const operation=lead.property.operation.toLowerCase();
 if((operation==="venta"&&kind!=="venta")||(["alquiler","renta"].includes(operation)&&kind!=="alquiler"))return fail("Operación incompatible con la propiedad",400);
 const selectedId=agentChoice==="auto"?lead.assignedAgentId:agentChoice||null;
 let agentId:string|null=null,agentName="Sin agente";
 if(selectedId){
  const agent=await db.adminUser.findUnique({where:{id:selectedId},select:{id:true,name:true,role:true,active:true}});
  if(!agent?.active||!agent.role.split(/[,+\s]+/).includes("agente"))return fail("Agente inválido",400);
  agentId=agent.id;agentName=agent.name;
 }
 try{
  const record=await db.commercialClosing.create({data:{leadId:lead.id,propertyId:lead.property.id,agentId,agentName,propertyRefCode:lead.property.refCode,clientName:lead.name,kind:kind!,currency:"USD",amount,commissionAmount,closedAt,notes:notes||null,createdByName:admin.name.slice(0,120)},select:{id:true}});
  return NextResponse.json({ok:true,id:record.id},{status:201,headers:{"Cache-Control":"no-store"}});
 }catch(e){
  if(e&&typeof e==="object"&&"code" in e&&e.code==="P2002")return fail("Este prospecto ya tiene un cierre",409);
  console.error("[standalone-closings] create",e instanceof Error?e.name:"unknown");
  return fail("No se pudo registrar el cierre",500);
 }
}
