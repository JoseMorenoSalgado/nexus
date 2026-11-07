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
 try{
  if(action==="property.create"||action==="property.update"||action==="property.delete"){
   if(!canEditProperties(JSON.stringify(admin.roles)))return fail(403,"Forbidden");
   if(action==="property.delete"){
    const id=text(body.id,80);
    const linked=await db.property.findUnique({where:{id},select:{_count:{select:{closings:true}}}});
    if(!linked)return fail(404,"Not found");
    if(linked._count.closings)return fail(409,"Cannot delete property with closings");
    await db.property.delete({where:{id}});
    return NextResponse.json({ok:true});
   }
   const title=text(body.title,180),city=text(body.city,120),type=text(body.type,80);
   const operation=text(body.operation,20);
   const price=Number(body.price);
   if(!title||!city||!type||!["venta","alquiler"].includes(operation)||!Number.isFinite(price)||price<0||price>99999999999)return fail(400,"Invalid property");
   const data={title,city,type,operation,price,description:text(body.description,10000),neighborhood:text(body.neighborhood,150)||null,published:body.published===true||body.published==="on"||body.published==="true"};
   if(action==="property.update"){
    const id=text(body.id,80);
    if(!await db.property.findUnique({where:{id},select:{id:true}}))return fail(404,"Not found");
    const property=await db.property.update({where:{id},data});
    return NextResponse.json({item:property});
   }
   const slug=text(body.slug,150).toLowerCase();
   if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug))return fail(400,"Invalid slug");
   const property=await db.$transaction(async tx=>{
    const seq=await tx.propertySequence.update({where:{id:"main"},data:{nextNumber:{increment:1}}});
    return tx.property.create({data:{...data,slug,refCode:seq.prefix+"-"+String(seq.nextNumber).padStart(5,"0")}});
   });
   return NextResponse.json({item:property},{status:201});
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
  if(action==="agent.create"){
   if(!canManageUsers(JSON.stringify(admin.roles)))return fail(403,"Forbidden");
   const name=text(body.name,180),email=text(body.email,254).toLowerCase(),password=String(body.password||"");
   if(!name||!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email)||password.length<12||password.length>1024)return fail(400,"Invalid agent");
   const item=await db.adminUser.create({data:{name,email,passwordHash:hashPassword(password),role:"agente"},select:{id:true,name:true,email:true,role:true}});
   return NextResponse.json({item},{status:201});
  }
  return fail(400,"Unknown action");
 }catch(error){
  console.error("Standalone write failure",error instanceof Error?error.name:"unknown");
  return fail(409,"Operation could not be completed");
 }
}
