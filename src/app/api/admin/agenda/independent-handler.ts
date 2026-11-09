import {NextRequest,NextResponse} from "next/server";
import {currentAdmin} from "@/lib/auth";
import {getStandalonePrisma} from "@/lib/prisma-standalone";
import {validMutationOrigin} from "@/lib/admin-property-request";
import {readJsonObjectLimited,RequestPayloadError} from "@/lib/limited-json";
export const runtime="nodejs";
export const dynamic="force-dynamic";
const fail=(error:string,status:number)=>NextResponse.json({error},{status,headers:{"Cache-Control":"no-store"}});
async function access(){
 const admin=await currentAdmin();
 if(!admin)return null;
 return admin.roles.some(role=>["admin","editor","agente"].includes(role))?admin:null;
}
export async function GET(){
 if(process.env.NEXUS_STANDALONE!=="true")return fail("No disponible",404);
 const admin=await access();
 if(!admin)return fail("No autorizado",403);
 const manager=admin.roles.includes("admin")||admin.roles.includes("editor");
 const scope=manager?{}:{lead:{is:{assignedAgentId:admin.userId}}};
 const db=getStandalonePrisma();
 const [events,leads]=await Promise.all([
  db.agendaEvent.findMany({where:scope,orderBy:{startsAt:"asc"},take:250,select:{id:true,title:true,type:true,startsAt:true,durationMinutes:true,status:true,location:true,meetingUrl:true,leadId:true,lead:{select:{name:true}}}}),
  db.lead.findMany({where:manager?{}:{assignedAgentId:admin.userId},orderBy:{createdAt:"desc"},take:200,select:{id:true,name:true}})
 ]);
 return NextResponse.json({events,leads},{headers:{"Cache-Control":"private, no-store"}});
}
export async function POST(req:NextRequest){
 if(process.env.NEXUS_STANDALONE!=="true")return fail("No disponible",404);
 const admin=await access();
 if(!admin)return fail("No autorizado",403);
 if(!validMutationOrigin(req))return fail("Origen no permitido",403);
 let body:Record<string,unknown>;
 try{body=await readJsonObjectLimited(req,8192);}catch(e){return fail(e instanceof RequestPayloadError?e.message:"Datos inválidos",e instanceof RequestPayloadError?e.status:400);}
 const permitted=["leadId","title","type","startsAt","durationMinutes","location","meetingUrl","notes"];
 if(Object.keys(body).some(k=>!permitted.includes(k)))return fail("Campos inválidos",400);
 const leadId=typeof body.leadId==="string"?body.leadId:"";
 const title=typeof body.title==="string"?body.title.trim():"";
 const type=typeof body.type==="string"?body.type:"";
 const startsAt=typeof body.startsAt==="string"?new Date(body.startsAt):new Date(NaN);
 const durationMinutes=typeof body.durationMinutes==="number"?body.durationMinutes:60;
 const location=typeof body.location==="string"?body.location.trim():"";
 const meetingUrl=typeof body.meetingUrl==="string"?body.meetingUrl.trim():"";
 const notes=typeof body.notes==="string"?body.notes.trim():"";
 if(!leadId||title.length<3||title.length>160||!["llamada","visita","reunion","seguimiento"].includes(type)||Number.isNaN(startsAt.getTime())||!Number.isInteger(durationMinutes)||durationMinutes<5||durationMinutes>480||location.length>300||meetingUrl.length>500||notes.length>2000)return fail("Datos inválidos",400);
 if(meetingUrl){try{const url=new URL(meetingUrl);if(!["https:","http:"].includes(url.protocol))return fail("Enlace inválido",400);}catch{return fail("Enlace inválido",400);}}
 const manager=admin.roles.includes("admin")||admin.roles.includes("editor");
 const db=getStandalonePrisma();
 const lead=await db.lead.findFirst({where:{id:leadId,...(!manager?{assignedAgentId:admin.userId}:{})},select:{id:true}});
 if(!lead)return fail("Prospecto no encontrado o sin permisos",404);
 try{
  const event=await db.agendaEvent.create({data:{leadId,title,type,startsAt,durationMinutes,location:location||null,meetingUrl:meetingUrl||null,notes:notes||null,createdByName:admin.name},select:{id:true}});
  return NextResponse.json({ok:true,id:event.id},{status:201,headers:{"Cache-Control":"no-store"}});
 }catch(e){console.error("[standalone-agenda] create",e instanceof Error?e.name:"unknown");return fail("No se pudo programar la actividad",500);}
}
