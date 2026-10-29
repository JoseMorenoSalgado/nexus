import "server-only";
import nodemailer from "nodemailer";
import {environmentIntegrations,integrationsForTenant,smtpValid,type SmtpConfig} from "@/lib/integration-config";

export function smtpEnabled(){return smtpValid(environmentIntegrations().smtp);}
export async function smtpReadyForTenant(tenantId:string){
 return smtpValid(integrationsForTenant(tenantId).smtp);
}
export type MailResult="disabled"|"sent"|"failed";
async function sendViaSmtp(config:SmtpConfig,subject:string,body:string):Promise<MailResult>{
 if(!smtpValid(config))return "disabled";
 try{
  const transport=nodemailer.createTransport({
   host:config.host,port:config.port,secure:config.port===465,requireTLS:config.port===587,
   auth:{user:config.user,pass:config.password},
   connectionTimeout:5000,greetingTimeout:5000,socketTimeout:8000,
   tls:{rejectUnauthorized:true}
  });
  const delivery=await transport.sendMail({from:config.from,to:config.to,subject,text:body});
  return delivery.accepted?.length?"sent":"failed";
 }catch(error){
  console.warn("[smtp] notification failed",error instanceof Error?error.name:"unknown");
  return "failed";
 }
}
export async function testTenantSmtp(tenantId:string):Promise<MailResult>{
 const config=integrationsForTenant(tenantId).smtp;
 return sendViaSmtp(config,"NEXUS: prueba de correo SMTP",
  "El servidor SMTP aceptó esta prueba de NEXUS. La entrega definitiva depende del proveedor y de los filtros del destinatario.");
}
export async function notifyAgendaEmail({tenantId,title,startsAt,type,leadName,meetingUrl,action}:{
 tenantId:string;title:string;startsAt:Date;type:string;leadName:string;meetingUrl:string|null;action:"programada"|"reprogramada";
}):Promise<MailResult>{
 const config=integrationsForTenant(tenantId).smtp;
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
 return sendViaSmtp(config,"NEXUS: actividad "+action,lines.join("\n"));
}
