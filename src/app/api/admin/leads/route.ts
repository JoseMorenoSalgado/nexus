import {NextRequest,NextResponse} from "next/server";
import {currentAdmin} from "@/lib/auth";
import {getStandalonePrisma} from "@/lib/prisma-standalone";
import {validMutationOrigin} from "@/lib/admin-property-request";
import {readJsonObjectLimited,RequestPayloadError} from "@/lib/limited-json";
import {parseRoles} from "@/lib/roles";
export const runtime="nodejs";
export const dynamic="force-dynamic";
/** Standalone CRM lead inbox. Legacy installations must use their existing routes. */
export async function GET(req:NextRequest){
 if(process.env.NEXUS_STANDALONE!=="true")return NextResponse.json({error:"No disponible"},{status:404});
 const admin=await currentAdmin();
 if(!admin)return NextResponse.json({error:"No autorizado"},{status:401});
 const allowed=admin.roles.includes("admin")||admin.roles.includes("editor")||admin.roles.includes("agente");
 if(!allowed)return NextResponse.json({error:"Sin permisos"},{status:403});
 const raw=Number(req.nextUrl.searchParams.get("page")||"1");
 const page=Number.isSafeInteger(raw)&&raw>=1&&raw<=10000?raw:1;
 const where=admin.roles.includes("admin")||admin.roles.includes("editor")?{}:{assignedAgentId:admin.userId};
 const db=getStandalonePrisma();
 const [total,leads]=await Promise.all([
  db.lead.count({where}),
  db.lead.findMany({where,orderBy:[{createdAt:"desc"},{id:"desc"}],skip:(page-1)*25,take:25,
   select:{id:true,name:true,phone:true,email:true,message:true,source:true,createdAt:true,assignedAgentId:true,
    property:{select:{id:true,title:true,refCode:true}},
    crm:true}})
 ]);
 return NextResponse.json({leads,total,page,pageSize:25},{headers:{"Cache-Control":"private, no-store"}});
}

/** Register a prospect directly in the independent PostgreSQL database. */
export async function POST(req:NextRequest){
 if(process.env.NEXUS_STANDALONE!=="true")return NextResponse.json({error:"No disponible"},{status:404});
 const admin=await currentAdmin();
 if(!admin)return NextResponse.json({error:"No autorizado"},{status:401});
 const manager=admin.roles.includes("admin")||admin.roles.includes("editor");
 if(!manager&&!admin.roles.includes("agente"))return NextResponse.json({error:"Sin permisos"},{status:403});
 if(!validMutationOrigin(req))return NextResponse.json({error:"Origen no permitido"},{status:403});
 let body:Record<string,unknown>;
 try{body=await readJsonObjectLimited(req,8192);}
 catch(e){return NextResponse.json({error:e instanceof RequestPayloadError?e.message:"Datos inválidos"},{status:e instanceof RequestPayloadError?e.status:400});}
 const permitted=["name","phone","email","message","source","propertyId","assignedAgentId","consent"];
 if(Object.keys(body).some(k=>!permitted.includes(k)))return NextResponse.json({error:"Campos inválidos"},{status:400});
 const name=typeof body.name==="string"?body.name.trim():"";
 const phone=typeof body.phone==="string"?body.phone.trim():"";
 const email=typeof body.email==="string"?body.email.trim():"";
 const message=typeof body.message==="string"?body.message.trim():"";
 const source=typeof body.source==="string"?body.source.trim():"manual";
 const propertyId=typeof body.propertyId==="string"?body.propertyId.trim():"";
 const assigned=typeof body.assignedAgentId==="string"?body.assignedAgentId.trim():"";
 if(name.length<2||name.length>120||!/^[+\\d() -]{7,30}$/.test(phone)||email.length>180||(email&&!/^\\S+@\\S+\\.\\S+$/.test(email))||message.length>2000||source.length<1||source.length>80||body.consent!==true)return NextResponse.json({error:"Revisa los datos y confirma el consentimiento"},{status:400});
 if(assigned&&!manager)return NextResponse.json({error:"No puedes asignar otro agente"},{status:403});
 const db=getStandalonePrisma();
 try{
  const property=propertyId?await db.property.findUnique({where:{id:propertyId},select:{id:true,assignedAgentId:true}}):null;
  if(propertyId&&!property)return NextResponse.json({error:"Propiedad no encontrada"},{status:400});
  if(property&&!manager&&property.assignedAgentId!==admin.userId)return NextResponse.json({error:"Propiedad no asignada"},{status:403});
  const agentId=manager?(assigned||property?.assignedAgentId||null):admin.userId;
  if(agentId){
   const agent=await db.adminUser.findFirst({where:{id:agentId,active:true},select:{role:true}});
   if(!agent||!parseRoles(agent.role).includes("agente"))return NextResponse.json({error:"Agente no válido"},{status:400});
  }
  const lead=await db.lead.create({data:{name,phone,email:email||null,message:message||null,source,propertyId:property?.id||null,assignedAgentId:agentId,consent:true},select:{id:true}});
  return NextResponse.json({id:lead.id,ok:true},{status:201,headers:{"Cache-Control":"no-store"}});
 }catch(e){
  console.error("[standalone-crm] create lead",e instanceof Error?e.name:"unknown");
  return NextResponse.json({error:"No se pudo registrar el prospecto"},{status:500});
 }
}
