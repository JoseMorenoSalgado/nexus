import {readJsonObjectLimited,RequestPayloadError} from "@/lib/limited-json";
import {validPublicMutationOrigin} from "@/lib/public-request-origin";
import {isStandaloneMode} from "@/lib/installation-mode";
import {NextResponse} from "next/server";
import {currentStandaloneAdmin} from "@/lib/independent-auth";
import {getStandalonePrisma} from "@/lib/prisma-standalone";
import {canManageLeads,canManageUsers} from "@/lib/roles";
import {hashPassword} from "@/lib/auth";
export const dynamic="force-dynamic";
const fail=(status:number,message:string)=>NextResponse.json({error:message},{status});
const text=(value:unknown,max=300)=>typeof value==="string"?value.trim().slice(0,max):"";
export async function POST(request:Request){
 if(!isStandaloneMode())return new Response(null,{status:404});
 if(!validPublicMutationOrigin(request.headers))return fail(403,"Invalid request origin");
 const admin=await currentStandaloneAdmin();
 if(!admin)return fail(401,"Unauthorized");
 if(!admin.roles.some(role=>role==="admin"||role==="editor"))return fail(403,"Sin permisos");
 let body:Record<string,unknown>;
 try{body=await readJsonObjectLimited(request,65536);}
 catch(error){return error instanceof RequestPayloadError?fail(error.status,error.message):fail(400,"Datos inválidos");}
 const action=text(body.action,40);
 const db=getStandalonePrisma();
 const requestId=crypto.randomUUID();
 try{
  if(action.startsWith("property."))return fail(410,"Gestiona los inmuebles desde /admin/propiedades.");
  if(action==="lead.create"||action==="lead.update"){
   if(!canManageLeads(JSON.stringify(admin.roles)))return fail(403,"Forbidden");
   if(action==="lead.create"){
    const name=text(body.name,180),phone=text(body.phone,60);
    if(!name||!phone)return fail(400,"Name and phone required");
    const propertyId=text(body.propertyId,80)||null;
    if(propertyId&&!await db.property.findUnique({where:{id:propertyId},select:{id:true}}))return fail(400,"Unknown property");
    const item=await db.lead.create({data:{name,phone,propertyId,email:text(body.email,254)||null,message:text(body.message,5000)||null,source:"admin",consent:body.consent===true}});
    return NextResponse.json({item},{status:201});
   }
   const id=text(body.id,80),status=text(body.status,40);
   if(!["nuevo","contactado","seguimiento","cerrado","descartado"].includes(status))return fail(400,"Invalid status");
   if(!await db.lead.findUnique({where:{id},select:{id:true}}))return fail(404,"Not found");
   const item=await db.leadCrm.upsert({where:{leadId:id},create:{leadId:id,status},update:{status}});
   return NextResponse.json({item});
  }
  if(action==="agenda.create"||action==="agenda.update"){
   if(!canManageLeads(JSON.stringify(admin.roles)))return fail(403,"Forbidden");
   const title=text(body.title,180),leadId=text(body.leadId,80),startsAt=new Date(String(body.startsAt||""));
   if(!title||!Number.isFinite(startsAt.getTime()))return fail(400,"Invalid agenda event");
   const data={title,startsAt,type:text(body.type,60)||"cita",location:text(body.location,250)||null,notes:text(body.notes,3000)||null};
   if(action==="agenda.create"){
    if(!leadId||!await db.lead.findUnique({where:{id:leadId},select:{id:true}}))return fail(400,"Unknown lead");
    const item=await db.agendaEvent.create({data:{...data,leadId,createdByName:admin.name}});
    return NextResponse.json({item},{status:201});
   }
   const id=text(body.id,80);
   if(!await db.agendaEvent.findUnique({where:{id},select:{id:true}}))return fail(404,"Not found");
   const item=await db.agendaEvent.update({where:{id},data});
   return NextResponse.json({item});
  }
  if(action==="lead.assign"){
   if(!canManageLeads(JSON.stringify(admin.roles)))return fail(403,"Forbidden");
   const id=text(body.id,80),agentId=text(body.agentId,80)||null;
   const lead=await db.lead.findUnique({where:{id},include:{assignedAgent:true}});
   if(!lead)return fail(404,"Prospecto no encontrado");
   const agent=agentId?await db.adminUser.findFirst({where:{id:agentId,active:true}}):null;
   if(agentId&&!agent)return fail(400,"Agente desconocido");
   await db.$transaction(async tx=>{
    await tx.lead.update({where:{id},data:{assignedAgentId:agentId}});
    await tx.leadAssignmentHistory.create({data:{leadId:id,fromAgentId:lead.assignedAgentId,fromAgentName:lead.assignedAgent?.name||null,toAgentId:agentId,toAgentName:agent?.name||null,changedByName:admin.name}});
   });
   return NextResponse.json({ok:true});
  }
  if(action==="agent.create"){
   if(!canManageUsers(JSON.stringify(admin.roles)))return fail(403,"Forbidden");
   const name=text(body.name,180),email=text(body.email,254).toLowerCase(),password=String(body.password||"");
   if(!name||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||password.length<12||password.length>256||!/[a-z]/i.test(password)||!/\d/.test(password))return fail(400,"Invalid agent");
   const item=await db.adminUser.create({data:{name,email,passwordHash:hashPassword(password),role:"agente"},select:{id:true,name:true,email:true,role:true}});
   return NextResponse.json({item},{status:201});
  }
  return fail(400,"Unknown action");
 }catch(error){
  const code=error&&typeof error==="object"&&"code" in error?String(error.code):"unknown";
  console.error("[standalone.manage] write failure",{requestId,action,code});
  if(code==="P2003")return fail(409,"La operación está bloqueada por registros relacionados.");
  if(code==="P2002")return NextResponse.json({error:"Ya existe un registro con ese identificador. Verifica la URL de la propiedad.",requestId},{status:409});
  if(code==="P2025")return NextResponse.json({error:"Falta un registro necesario para completar la operación. Revisa la configuración inicial.",requestId},{status:409});
  return NextResponse.json({error:"No se pudo completar la operación. Comunica la referencia al soporte.",requestId},{status:500});
 }
}
