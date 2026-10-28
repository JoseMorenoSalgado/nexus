import {NextRequest} from "next/server";
import {prisma} from "@/lib/prisma";
import {requireAdmin} from "@/lib/auth";
import {tenantModuleEnabled} from "@/lib/tenant-modules";
import {leadWhere} from "@/lib/agent-scope";
import {AGENDA_DURATIONS,isAgendaType,parseAgendaStartsAt,parseMeetingUrl} from "@/lib/agenda";
import {propertyRedirect,validMutationOrigin} from "@/lib/admin-property-request";
import {notifyAgendaEmail} from "@/lib/smtp-notifications";
export const runtime="nodejs";
const back=(code:string)=>propertyRedirect("/admin/agenda?error="+encodeURIComponent(code));
export async function POST(req:NextRequest){
 const user=await requireAdmin();
 if(!await tenantModuleEnabled(user.tenantId,"agenda"))return new Response("Módulo desactivado",{status:403});
 if(!user.roles.some(r=>["admin","editor","agente"].includes(r)))return back("permisos");
 if(!validMutationOrigin(req))return back("origen");
 const length=Number(req.headers.get("content-length")||0);
 if(!Number.isSafeInteger(length)||length>12000)return back("datos");
 let form:FormData;
 try{form=await req.formData();}catch{return back("datos");}
 const read=(name:string,max:number)=>{
  const value=form.get(name);
  return typeof value==="string"&&value.length<=max?value.trim():null;
 };
 const leadId=read("leadId",100),type=read("type",30),title=read("title",140);
 const location=read("location",180),notes=read("notes",2000);
 const meetingUrl=parseMeetingUrl(form.get("meetingUrl"));
 const notifyByEmail=form.get("notifyByEmail")==="on";
 const startsAt=parseAgendaStartsAt(form.get("startsAt"));
 const duration=Number(form.get("durationMinutes"));
 if(!leadId||!type||!isAgendaType(type)||!title||title.length<3||location===null||notes===null||
  meetingUrl===false||(meetingUrl&&type!=="reunion")||
  !startsAt||!AGENDA_DURATIONS.some(n=>n===duration))return back("datos");
 const lead=await prisma.lead.findFirst({where:{id:leadId,...leadWhere(user)},select:{id:true,name:true}});
 if(!lead)return back("prospecto");
 try{
  await prisma.agendaEvent.create({data:{tenantId:user.tenantId,leadId:lead.id,type,title,
   startsAt,durationMinutes:duration,location:location||null,meetingUrl:meetingUrl||null,
   notes:notes||null,createdByName:user.name.slice(0,120)}});
  const mail=notifyByEmail?await notifyAgendaEmail({title,startsAt,type,leadName:lead.name,
   meetingUrl:meetingUrl||null,action:"programada"}):"disabled";
  return propertyRedirect("/admin/agenda?mes="+startsAt.toISOString().slice(0,7)+"&created=1&mail="+mail);
 }catch(error){
  console.error("[agenda] create failed",error instanceof Error?error.name:"unknown");
  return back("servidor");
 }
}
