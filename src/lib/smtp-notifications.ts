import "server-only";
import nodemailer from "nodemailer";

/** SMTP configured in private Plesk environment settings, never in the browser or database. */
const EMAIL=/^[^\s@,<>]+@[^\s@,<>]+\.[^\s@,<>]+$/;
export function smtpEnabled(){
 const v=process.env;
 return v.SMTP_ENABLED==="true"&&!!v.SMTP_HOST&&!!v.SMTP_USER&&!!v.SMTP_PASSWORD&&
  !!v.SMTP_FROM&&EMAIL.test(v.SMTP_FROM)&&!!v.SMTP_NOTIFY_TO&&EMAIL.test(v.SMTP_NOTIFY_TO);
}
export type MailResult="disabled"|"sent"|"failed";
export async function notifyAgendaEmail({title,startsAt,type,leadName,meetingUrl,action}:{
 title:string;startsAt:Date;type:string;leadName:string;meetingUrl:string|null;action:"programada"|"reprogramada";
}):Promise<MailResult>{
 if(!smtpEnabled())return "disabled";
 const port=Number(process.env.SMTP_PORT||"587");
 if(!Number.isInteger(port)||![465,587].includes(port))return "failed";
 const lines=[
  "NEXUS Real Estate — notificación de agenda",
  "Actividad "+action,
  "Título: "+title.replace(/[\r\n]+/g," ").slice(0,140),
  "Prospecto: "+leadName.replace(/[\r\n]+/g," ").slice(0,120),
  "Tipo: "+type.replace(/[\r\n]+/g," ").slice(0,40),
  "Fecha y hora (UTC): "+startsAt.toISOString(),
  ...(meetingUrl?["Videoconferencia: "+meetingUrl]:[]),
  "Consulta el panel de NEXUS para los detalles y cambios."
 ];
 try{
  const transport=nodemailer.createTransport({
   host:process.env.SMTP_HOST,port,secure:port===465,requireTLS:port===587,
   auth:{user:process.env.SMTP_USER!,pass:process.env.SMTP_PASSWORD!},
   connectionTimeout:5000,greetingTimeout:5000,socketTimeout:8000,
   tls:{rejectUnauthorized:true}
  });
  const response=await transport.sendMail({
   from:process.env.SMTP_FROM!,
   to:process.env.SMTP_NOTIFY_TO!,
   subject:"NEXUS: actividad "+action,
   text:lines.join("\n")
  });
  return response.accepted?.length?"sent":"failed";
 }catch(error){
  console.warn("[smtp] notification failed",error instanceof Error?error.name:"unknown");
  return "failed";
 }
}
