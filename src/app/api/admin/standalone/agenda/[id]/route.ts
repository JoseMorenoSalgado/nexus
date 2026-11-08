import {NextRequest,NextResponse} from "next/server";
import {currentAdmin} from "@/lib/auth";
import {getStandalonePrisma} from "@/lib/prisma-standalone";
import {validMutationOrigin} from "@/lib/admin-property-request";
import {readJsonObjectLimited,RequestPayloadError} from "@/lib/limited-json";
export const runtime="nodejs";
const fail=(error:string,status:number)=>NextResponse.json({error},{status,headers:{"Cache-Control":"no-store"}});
export async function PATCH(req:NextRequest,{params}:{params:Promise<{id:string}>}){
 if(process.env.NEXUS_STANDALONE!=="true")return fail("No disponible",404);
 const admin=await currentAdmin();
 if(!admin)return fail("No autorizado",401);
 const manager=admin.roles.includes("admin")||admin.roles.includes("editor");
 if(!manager&&!admin.roles.includes("agente"))return fail("Sin permisos",403);
 if(!validMutationOrigin(req))return fail("Origen no permitido",403);
 let body:Record<string,unknown>;
 try{body=await readJsonObjectLimited(req,8192);}catch(e){return fail(e instanceof RequestPayloadError?e.message:"Datos inválidos",e instanceof RequestPayloadError?e.status:400);}
 const keys=Object.keys(body);
 if(!keys.length||keys.some(k=>!["status","startsAt"].includes(k)))return fail("Campos inválidos",400);
 const {id}=await params;
 const db=getStandalonePrisma();
 const scope={id,...(!manager?{lead:{is:{assignedAgentId:admin.userId}}}:{})};
 const event=await db.agendaEvent.findFirst({where:scope,select:{id:true,status:true}});
 if(!event)return fail("Actividad no encontrada",404);
 const data:{status?:string;startsAt?:Date;completedAt?:Date|null}={};
 if("status" in body){
  if(body.status!=="realizada"&&body.status!=="cancelada"&&body.status!=="pendiente")return fail("Estado inválido",400);
  if(event.status!=="pendiente"&&body.status!==event.status)return fail("No puedes cambiar una actividad finalizada",409);
  data.status=body.status;
  data.completedAt=body.status==="realizada"?new Date():null;
 }
 if("startsAt" in body){
  if(event.status!=="pendiente"||typeof body.startsAt!=="string")return fail("No puedes reprogramar esta actividad",409);
  const date=new Date(body.startsAt);
  if(Number.isNaN(date.getTime()))return fail("Fecha inválida",400);
  data.startsAt=date;
 }
 try{
  const result=await db.agendaEvent.updateMany({where:{...scope,status:event.status},data});
  if(result.count!==1)return fail("La actividad cambió; recarga e inténtalo de nuevo",409);
  return NextResponse.json({ok:true},{headers:{"Cache-Control":"no-store"}});
 }catch(e){console.error("[standalone-agenda] update",e instanceof Error?e.name:"unknown");return fail("No se pudo actualizar la actividad",500);}
}
