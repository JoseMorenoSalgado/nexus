import {NextRequest} from "next/server";
import {prisma} from "@/lib/prisma";
import {requireAdmin} from "@/lib/auth";
import {tenantModuleEnabled} from "@/lib/tenant-modules";
import {AGENDA_DURATIONS,agendaScope,isAgendaStatus,parseAgendaStartsAt,parseMeetingUrl} from "@/lib/agenda";
import {propertyRedirect,validMutationOrigin} from "@/lib/admin-property-request";
import {notifyAgendaEmail} from "@/lib/smtp-notifications";
export const runtime="nodejs";
const back=(code:string)=>propertyRedirect("/admin/agenda?error="+encodeURIComponent(code));
export async function POST(req:NextRequest,{params}:{params:Promise<{id:string}>}){
 const {id}=await params;
 const user=await requireAdmin();
 if(!await tenantModuleEnabled(user.tenantId,"agenda"))return new Response("Módulo desactivado",{status:403});
 if(!user.roles.some(r=>["admin","editor","agente"].includes(r)))return back("permisos");
 if(!validMutationOrigin(req))return back("origen");
 const length=Number(req.headers.get("content-length")||0);
 if(!Number.isSafeInteger(length)||length>10000||id.length>100)return back("datos");
 const existing=await prisma.agendaEvent.findFirst({where:{id,...agendaScope(user)},select:{id:true,status:true,title:true,type:true,startsAt:true,meetingUrl:true,lead:{select:{name:true}}}});
 if(!existing)return back("noexiste");
 let form:FormData;
 try{form=await req.formData();}catch{return back("datos");}
 const intent=form.get("intent");
 let data:{status?:string;completedAt?:Date|null;startsAt?:Date;durationMinutes?:number;meetingUrl?:string|null}={};
 if(intent==="status"){
  const status=form.get("status");
  if(typeof status!=="string"||!isAgendaStatus(status))return back("datos");
  data={status,completedAt:status==="realizada"?new Date():null};
 }else if(intent==="reschedule"){
  const startsAt=parseAgendaStartsAt(form.get("startsAt"));
  const duration=Number(form.get("durationMinutes"));
  const meetingUrl=parseMeetingUrl(form.get("meetingUrl"));
  if(!startsAt||meetingUrl===false||(!AGENDA_DURATIONS.some(n=>n===duration))||
    (meetingUrl&&existing.type!=="reunion"))return back("datos");
  data={startsAt,durationMinutes:duration,status:"pendiente",completedAt:null,
   ...(form.has("meetingUrl")?{meetingUrl:meetingUrl||null}:{})};
 }else return back("datos");
 try{
  // Repeat the authorization scope in the UPDATE to avoid a stale read after lead transfer.
  const result=await prisma.agendaEvent.updateMany({where:{id,...agendaScope(user)},data});
  const requested=form.get("mes");
  const originalMonth=typeof requested==="string"&&/^\d{4}-(0[1-9]|1[0-2])$/.test(requested)?requested:"";
  const month=intent==="reschedule"&&data.startsAt?data.startsAt.toISOString().slice(0,7):originalMonth;
  if(!result.count)return back("noexiste");
  const notify=form.get("notifyByEmail")==="on"&&intent==="reschedule";
  const mail=notify&&data.startsAt?await notifyAgendaEmail({title:existing.title,
   startsAt:data.startsAt,type:existing.type,leadName:existing.lead.name,
   meetingUrl:data.meetingUrl===undefined?existing.meetingUrl:data.meetingUrl,
   action:"reprogramada"}):"disabled";
  return propertyRedirect("/admin/agenda?"+(month?"mes="+month+"&":"")+"updated=1&mail="+mail);
 }catch(error){
  console.error("[agenda] update failed",error instanceof Error?error.name:"unknown");
  return back("servidor");
 }
}
