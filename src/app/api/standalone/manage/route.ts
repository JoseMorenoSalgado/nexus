import {NextResponse} from "next/server";
import {currentStandaloneAdmin} from "@/lib/standalone/auth";
import {standalonePrisma} from "@/lib/standalone/db";
import {canEditProperties,canManageLeads,canManageUsers} from "@/lib/roles";
import {hashPassword} from "@/lib/auth";
export const dynamic="force-dynamic";
const fail=(status:number,message:string)=>NextResponse.json({error:message},{status});
const text=(value:unknown,max=300)=>typeof value==="string"?value.trim().slice(0,max):"";
function validOrigin(request:Request){
 try{
  const expected=new URL(process.env.SITE_URL||"");
  const origin=new URL(request.headers.get("origin")||"");
  return expected.protocol==="https:"&&origin.origin===expected.origin;
 }catch{return false;}
}
export async function POST(request:Request){
 if(process.env.NEXUS_STANDALONE_MODE!=="true")return new Response(null,{status:404});
 if(!validOrigin(request))return fail(403,"Invalid request origin");
 const admin=await currentStandaloneAdmin();
 if(!admin)return fail(401,"Unauthorized");
 const body:Record<string,unknown>=await request.json().catch(()=>({}));
 const action=text(body.action,40);
 const db=standalonePrisma();
 const requestId=crypto.randomUUID();
 try{
  if(action==="property.create"||action==="property.update"||action==="property.delete"||action==="property.photo.add"||action==="property.photo.delete"){
   if(!canEditProperties(JSON.stringify(admin.roles)))return fail(403,"Forbidden");
   if(action==="property.delete"){
    const id=text(body.id,80);
    const linked=await db.property.findUnique({where:{id},select:{_count:{select:{closings:true}}}});
    if(!linked)return fail(404,"Not found");
    if(linked._count.closings)return fail(409,"Cannot delete property with closings");
    await db.property.delete({where:{id}});
    return NextResponse.json({ok:true});
   }
   if(action==="property.photo.add"||action==="property.photo.delete"){
    const propertyId=text(body.propertyId,80);
    if(!await db.property.findUnique({where:{id:propertyId},select:{id:true}}))return fail(404,"Propiedad no encontrada");
    if(action==="property.photo.delete"){
     const photoId=text(body.photoId,80);
     const result=await db.photo.deleteMany({where:{id:photoId,propertyId}});
     return result.count?NextResponse.json({ok:true}):fail(404,"Fotografía no encontrada");
    }
    const url=text(body.url,2000);
    let parsed:URL;
    try{parsed=new URL(url);}catch{return fail(400,"URL de fotografía inválida");}
    if(parsed.protocol!=="https:"||parsed.username||parsed.password)return fail(400,"La fotografía requiere URL HTTPS");
    const item=await db.photo.create({data:{propertyId,url,alt:text(body.alt,180)||null,sortOrder:Number.isSafeInteger(Number(body.sortOrder))?Math.max(0,Math.min(10000,Number(body.sortOrder))):0}});
    return NextResponse.json({item},{status:201});
   }
   const title=text(body.title,180),city=text(body.city,120),type=text(body.type,80);
   const operation=text(body.operation,20);
   const price=Number(body.price);
   if(!title||!city||!type||!["venta","alquiler"].includes(operation)||!Number.isFinite(price)||price<0||price>99999999999)return fail(400,"Invalid property");
   const agentId=text(body.assignedAgentId,80)||null;
   if(agentId&&!await db.adminUser.findFirst({where:{id:agentId,active:true},select:{id:true}}))return fail(400,"Agente desconocido");
   const bedrooms=Number(body.bedrooms||0),bathrooms=Number(body.bathrooms||0),areaM2=Number(body.areaM2||0);
   if(![bedrooms,bathrooms,areaM2].every(v=>Number.isSafeInteger(v)&&v>=0&&v<=1000000))return fail(400,"Características inválidas");
   const data={title,city,type,operation,price,description:text(body.description,10000),neighborhood:text(body.neighborhood,150)||null,published:body.published===true||body.published==="on"||body.published==="true",assignedAgentId:agentId,bedrooms,bathrooms,areaM2};
   if(action==="property.update"){
    const id=text(body.id,80);
    if(!await db.property.findUnique({where:{id},select:{id:true}}))return fail(404,"Not found");
    const property=await db.property.update({where:{id},data});
    return NextResponse.json({item:property});
   }
   const slug=text(body.slug,150).toLowerCase();
   if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug))return fail(400,"Invalid slug");
   const duplicate=await db.property.findUnique({where:{slug},select:{id:true}});
   if(duplicate)return fail(409,"Ya existe una propiedad con esa URL. Utiliza un slug diferente.");
   const property=await db.$transaction(async tx=>{
    const seq=await tx.propertySequence.update({where:{id:"main"},data:{nextNumber:{increment:1}}});
    return tx.property.create({data:{...data,slug,refCode:seq.prefix+"-"+String(seq.nextNumber).padStart(5,"0")}});
   });
   console.info("[standalone.property.create] saved",{requestId,propertyId:property.id,published:property.published});
   return NextResponse.json({ok:true,requestId,property:{id:property.id,slug:property.slug,refCode:property.refCode,published:property.published}},{status:201});
  }
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
  if(action==="agent.create"||action==="user.create"){
   if(!canManageUsers(JSON.stringify(admin.roles)))return fail(403,"Forbidden");
   const name=text(body.name,180),email=text(body.email,254).toLowerCase(),password=String(body.password||"");
   if(!name||!/^\S+@\S+\.\S+$/.test(email)||password.length<12||password.length>1024)return fail(400,"Invalid agent");
   const role=action==="agent.create"?"agente":text(body.role,20);
   if(!["admin","editor","agente","lector"].includes(role))return fail(400,"Rol no permitido");
   const item=await db.adminUser.create({data:{name,email,passwordHash:hashPassword(password),role,active:true},select:{id:true,name:true,email:true,role:true}});
   return NextResponse.json({item},{status:201});
  }
  return fail(400,"Unknown action");
 }catch(error){
  const code=error&&typeof error==="object"&&"code" in error?String(error.code):"unknown";
  console.error("[standalone.manage] write failure",{requestId,action,code,error});
  if(code==="P2002")return NextResponse.json({error:"Ya existe un registro con ese identificador. Verifica la URL de la propiedad.",requestId},{status:409});
  if(code==="P2025")return NextResponse.json({error:"Falta un registro necesario para completar la operación. Revisa la configuración inicial.",requestId},{status:409});
  return NextResponse.json({error:"No se pudo completar la operación. Comunica la referencia al soporte.",requestId},{status:500});
 }
}
