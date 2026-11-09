import {NextRequest,NextResponse} from "next/server";
import {currentAdmin} from "@/lib/auth";
import {parseLeadContact} from "@/lib/lead-contact";
import {parseRoles} from "@/lib/roles";
import {getStandalonePrisma} from "@/lib/prisma-standalone";
import {validMutationOrigin} from "@/lib/admin-property-request";
import {readJsonObjectLimited,RequestPayloadError} from "@/lib/limited-json";
export const runtime="nodejs";
const error=(message:string,status:number)=>NextResponse.json({error:message},{status,headers:{"Cache-Control":"no-store"}});
export async function PATCH(req:NextRequest,{params}:{params:Promise<{id:string}>}){
 if(process.env.NEXUS_STANDALONE!=="true")return error("No disponible",404);
 const admin=await currentAdmin();
 if(!admin)return error("No autorizado",401);
 const isAdmin=admin.roles.includes("admin")||admin.roles.includes("editor");
 if(!isAdmin&&!admin.roles.includes("agente"))return error("Sin permisos",403);
 if(!validMutationOrigin(req))return error("Origen no permitido",403);
 let body:Record<string,unknown>;
 try{body=await readJsonObjectLimited(req,8192);}
 catch(e){return error(e instanceof RequestPayloadError?e.message:"Datos inválidos",e instanceof RequestPayloadError?e.status:400);}
 const allowed=["status","nextContactAt","note","assignedAgentId","contact"];
 if(Object.keys(body).some(k=>!allowed.includes(k))||!Object.keys(body).length)return error("Campos inválidos",400);
 const rawContact=body.contact;
 const contact=rawContact&&typeof rawContact==="object"&&!Array.isArray(rawContact)?parseLeadContact(rawContact as Record<string,unknown>):null;
 if("contact" in body&&!contact)return error("Revisa los datos de contacto",400);
 const {id}=await params;
 if("assignedAgentId" in body&&!isAdmin)return error("Solo un administrador puede asignar prospectos",403);
 if("assignedAgentId" in body&&(body.assignedAgentId!==null&&(typeof body.assignedAgentId!=="string"||!body.assignedAgentId.trim())))return error("Agente inválido",400);
 const targetAgentId="assignedAgentId" in body?body.assignedAgentId as string|null:undefined;
 const db=getStandalonePrisma();
 const scope={id,...(!isAdmin?{assignedAgentId:admin.userId}:{})};
 const lead=await db.lead.findFirst({where:scope,select:{id:true}});
 if(!lead)return error("Prospecto no encontrado",404);
 let status:string|undefined;
 if("status" in body){
  if(typeof body.status!=="string"||!["nuevo","contactado","seguimiento","calificado","cerrado","descartado"].includes(body.status))return error("Estado inválido",400);
  status=body.status;
 }
 let nextContactAt:Date|null|undefined;
 if("nextContactAt" in body){
  if(body.nextContactAt===null||body.nextContactAt==="")nextContactAt=null;
  else if(typeof body.nextContactAt==="string"&&!Number.isNaN(Date.parse(body.nextContactAt)))nextContactAt=new Date(body.nextContactAt);
  else return error("Fecha inválida",400);
 }
 let note:string|undefined;
 if("note" in body){
  if(typeof body.note!=="string"||body.note.trim().length<1||body.note.length>2000)return error("Nota inválida",400);
  note=body.note.trim();
 }
 try{
  await db.$transaction(async tx=>{
   const visible=await tx.lead.findFirst({where:scope,select:{id:true,assignedAgentId:true,assignedAgent:{select:{name:true}}}});
   if(!visible)throw new Error("NOT_FOUND");
   if(targetAgentId!==undefined){
    const target=targetAgentId===null?null:await tx.adminUser.findFirst({where:{id:targetAgentId,active:true},select:{id:true,name:true,role:true}});
    if(targetAgentId!==null&&(!target||!parseRoles(target.role).includes("agente")))throw new Error("INVALID_AGENT");
    if(visible.assignedAgentId!==targetAgentId){
     await tx.lead.update({where:{id},data:{assignedAgentId:targetAgentId}});
     await tx.leadAssignmentHistory.create({data:{leadId:id,fromAgentId:visible.assignedAgentId,fromAgentName:visible.assignedAgent?.name??null,toAgentId:target?.id??null,toAgentName:target?.name??null,changedByName:admin.name}});
    }
   }
   if(contact)await tx.lead.update({where:{id},data:contact});
   if(status!==undefined||nextContactAt!==undefined)await tx.leadCrm.upsert({where:{leadId:id},create:{leadId:id,...(status!==undefined?{status}:{}),...(nextContactAt!==undefined?{nextContactAt}:{})},update:{...(status!==undefined?{status}:{}),...(nextContactAt!==undefined?{nextContactAt}:{})}});
   if(note!==undefined)await tx.leadNote.create({data:{leadId:id,authorName:admin.name,body:note}});
  },{isolationLevel:"Serializable"});
  return NextResponse.json({ok:true},{headers:{"Cache-Control":"no-store"}});
 }catch(e){
  if(e instanceof Error&&e.message==="NOT_FOUND")return error("Prospecto no encontrado",404);
  if(e instanceof Error&&e.message==="INVALID_AGENT")return error("Agente no encontrado, inactivo o sin permisos",400);
  if(e&&typeof e==="object"&&"code" in e&&e.code==="P2034")return error("Conflicto de edición, inténtalo nuevamente",409);
  console.error("[standalone-crm] update lead",e instanceof Error?e.name:"unknown");
  return error("No se pudo actualizar el prospecto",500);
 }
}
