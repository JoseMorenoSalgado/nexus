import {hasDatabaseConfig} from "@/lib/server-config";
import {NextResponse,type NextRequest} from "next/server";
import {prisma} from "@/lib/prisma";
import {parseRoles} from "@/lib/roles";
import {tenantFromHost} from "@/lib/tenant";
import {tenantModuleEnabled} from "@/lib/tenant-modules";
import {readJsonObjectLimited,RequestPayloadError} from "@/lib/limited-json";
const missingColumn=(error:unknown)=>!!(error&&typeof error==="object"&&"code" in error&&error.code==="P2022");
export async function POST(req:NextRequest){
 if(!hasDatabaseConfig())return NextResponse.json({error:"Formulario disponible cuando se configure la base de datos."},{status:503});
 const origin=req.headers.get("origin");
 if(origin){try{if(new URL(origin).host!==req.headers.get("host"))return NextResponse.json({error:"Origen no autorizado"},{status:403});}catch{return NextResponse.json({error:"Origen inválido"},{status:403});}}
 let b:Record<string,unknown>;
 try{b=await readJsonObjectLimited(req,8192);}
 catch(error){return NextResponse.json({error:error instanceof RequestPayloadError?error.message:"Datos inválidos"},{status:error instanceof RequestPayloadError?error.status:400});}
 if(b.website)return NextResponse.json({ok:true});
 const name=String(b.name||"").trim().slice(0,120),phone=String(b.phone||"").trim().slice(0,30),email=String(b.email||"").trim().slice(0,180),message=String(b.message||"").trim().slice(0,2000);
 if(name.length<2||!/^[+\d() -]{7,30}$/.test(phone)||b.consent!=="yes"||(email&&!/^\S+@\S+\.\S+$/.test(email)))return NextResponse.json({error:"Revisa tus datos y acepta el consentimiento de contacto."},{status:400});
 try{
  const tenant=await tenantFromHost(req.headers.get("host")||"");
  if(!tenant)return NextResponse.json({error:"Sitio no encontrado"},{status:404});
  if(!await tenantModuleEnabled(tenant.tenantId,"inquiries"))return NextResponse.json({error:"Formulario desactivado."},{status:403});
  let propertyId:string|undefined;
  let assignedAgentId:string|null=null;
  let hasAgentColumn=true;
  if(typeof b.propertyId==="string"&&b.propertyId){
   try{
    const p=await prisma.property.findFirst({where:{id:b.propertyId,tenantId:tenant.tenantId,published:true},select:{id:true,assignedAgentId:true,assignedAgent:{select:{active:true,role:true,tenantId:true}}}});
    if(!p)return NextResponse.json({error:"Propiedad no encontrada"},{status:400});
    propertyId=p.id;
    if(p.assignedAgentId&&p.assignedAgent?.active&&p.assignedAgent.tenantId===tenant.tenantId&&parseRoles(p.assignedAgent.role).includes("agente"))assignedAgentId=p.assignedAgentId;
   }catch(error){
    if(!missingColumn(error))throw error;
    hasAgentColumn=false;
    const p=await prisma.property.findFirst({where:{id:b.propertyId,tenantId:tenant.tenantId,published:true},select:{id:true}});
    if(!p)return NextResponse.json({error:"Propiedad no encontrada"},{status:400});
    propertyId=p.id;
    console.warn("[web] Agent column unavailable; inquiry will be stored without assignment");
   }
  }
  const data={tenantId:tenant.tenantId,propertyId,name,phone,email:email||null,message:message||null,source:"web",consent:true};
  try{
   await prisma.lead.create({data:{...data,...(hasAgentColumn?{assignedAgentId}:{})},select:{id:true}});
  }catch(error){
   if(!missingColumn(error))throw error;
   await prisma.lead.create({data,select:{id:true}});
   console.warn("[web] Lead assigned agent column unavailable; inquiry stored without assignment");
  }
  return NextResponse.json({ok:true},{status:201});
 }catch(error){
  console.error("[web] Lead submission failed",error instanceof Error?error.name:"unknown");
  return NextResponse.json({error:"No pudimos registrar tu consulta en este momento. Intenta nuevamente."},{status:503});
 }
}
