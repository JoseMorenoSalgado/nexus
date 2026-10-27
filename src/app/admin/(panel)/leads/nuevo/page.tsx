import Link from "next/link";
import {ArrowLeft,UserPlus} from "lucide-react";
import {redirect} from "next/navigation";
import {requireRole} from "@/lib/auth";
import {getSiteTemplate} from "@/lib/site-template-store";
import {crmTablesReady} from "@/lib/crm-schema";
import {prisma} from "@/lib/prisma";
import {managesAllLeads} from "@/lib/agent-scope";
import {parseRoles} from "@/lib/roles";
export const dynamic="force-dynamic";
const errors:Record<string,string>={
 datos:"Revisa el nombre, teléfono y los campos del formulario.",
 correo:"Introduce un correo electrónico válido.",
 propiedad:"La propiedad seleccionada no pertenece a tu inmobiliaria.",
 agente:"Selecciona un agente activo de esta inmobiliaria.",
 consentimiento:"Confirma que el cliente autorizó el seguimiento de su consulta.",
 permisos:"Tu usuario no tiene permisos de edición.",
 origen:"La solicitud se hizo desde un origen no autorizado.",
 servidor:"No se pudo registrar el prospecto. Inténtalo nuevamente."
};
export default async function CreateLead({searchParams}:{searchParams:Promise<{error?:string;propertyId?:string}>}){
 const admin=await requireRole(["admin","editor","agente"]);
 const realEstate=(await getSiteTemplate(admin.tenantId)).key==="real-estate";
 if(!await crmTablesReady())redirect("/admin/leads");
 const props=realEstate?await prisma.property.findMany({where:{tenantId:admin.tenantId,...(!managesAllLeads(admin)?{assignedAgentId:admin.userId}:{})},select:{id:true,title:true,refCode:true},orderBy:{createdAt:"desc"},take:200}):[];
 const canEdit=admin.roles.some(r=>["admin","editor","agente"].includes(r));
 const users=managesAllLeads(admin)?await prisma.adminUser.findMany({where:{tenantId:admin.tenantId,active:true},select:{id:true,name:true,role:true},orderBy:{name:"asc"}}):[];
 const agents=users.filter(u=>parseRoles(u.role).includes("agente"));
 const q=await searchParams;
 const selectedProperty=props.some(property=>property.id===q.propertyId)?q.propertyId:"";
 return <>
  <div className="crm-detail-head"><Link href="/admin/leads" className="inline-link"><ArrowLeft size={16}/> Volver a consultas</Link></div>
  <div className="admin-heading"><div><h1>{realEstate?"Registrar prospecto":"Nueva consulta"}</h1><p>Guarda un contacto recibido por WhatsApp, teléfono o atención directa para darle seguimiento.</p></div></div>
  {q.error&&<p role="alert" className="admin-error">{errors[q.error]||errors.servidor}</p>}
  {!canEdit?<p className="admin-error">Tu usuario no tiene permisos para registrar prospectos.</p>:<form method="post" action="/api/admin/crm/leads" className="admin-form property-editor crm-create-form">
   <div className="property-form-section"><h2>Datos de contacto</h2>
    <div className="admin-form-grid">
     <label>Nombre completo *<input name="name" maxLength={120} minLength={2} required placeholder="Nombre del cliente"/></label>
     <label>Teléfono / WhatsApp *<input type="tel" name="phone" maxLength={30} minLength={7} required placeholder="8888 8888"/></label>
    </div>
    <div className="admin-form-grid">
     <label>Correo electrónico<input name="email" type="email" maxLength={180} placeholder="cliente@ejemplo.com"/></label>
     <label>Canal de entrada<select name="source" defaultValue="whatsapp"><option value="whatsapp">WhatsApp</option><option value="telefono">Llamada telefónica</option><option value="manual">Atención directa</option></select></label>
    </div>
    {realEstate&&<label>Propiedad de interés<select name="propertyId" defaultValue={selectedProperty} required={realEstate&&!managesAllLeads(admin)}><option value="">{managesAllLeads(admin)?"Consulta general, sin propiedad específica":"Selecciona una de tus propiedades"}</option>{props.map(p=><option key={p.id} value={p.id}>{p.refCode} · {p.title}</option>)}</select></label>}
    {managesAllLeads(admin)&&<label>Responsable comercial<select name="assignedAgentId" defaultValue="auto"><option value="auto">Automático según el inmueble</option><option value="">Sin asignar</option>{agents.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</select></label>}
    <label>Observaciones de la consulta<textarea name="message" maxLength={2000} placeholder={realEstate?"Ej.: Solicita precio y disponibilidad para visitar la propiedad.":"Ej.: Desea información sobre fechas, programas o servicios."}/></label>
   </div>
   <div className="property-form-section"><h2>Privacidad del contacto</h2>
    <label className="property-check"><input type="checkbox" name="consent" required/> Confirmo que el cliente autorizó que lo contactemos por esta consulta.</label>
    <p className="property-help">No registres datos personales si el cliente no ha autorizado el contacto.</p>
   </div>
   <div className="property-editor-actions"><button type="submit" className="btn btn-red"><UserPlus size={17}/>{realEstate?"Guardar prospecto":"Guardar consulta"}</button><Link href="/admin/leads" className="btn wizard-back">Cancelar</Link></div>
  </form>}
 </>;
}
