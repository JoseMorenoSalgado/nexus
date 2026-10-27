import Link from "next/link";
import {notFound} from "next/navigation";
import {Building2,ArrowLeft,Mail,UserRound,UsersRound,ExternalLink} from "lucide-react";
import {requireRole} from "@/lib/auth";
import {prisma} from "@/lib/prisma";
import {parseRoles,ROLE_LABELS} from "@/lib/roles";
import {crmTablesReady} from "@/lib/crm-schema";
export const dynamic="force-dynamic";
export default async function AgentDetail({params}:{params:Promise<{id:string}>}){
 const admin=await requireRole(["admin","agente"]);
 const {id}=await params;
 if(!admin.roles.includes("admin")&&id!==admin.userId)notFound();
 const agent=await prisma.adminUser.findFirst({
  where:{id,tenantId:admin.tenantId},
  select:{id:true,name:true,email:true,role:true,active:true}
 });
 if(!agent||!parseRoles(agent.role).includes("agente"))notFound();
 const [properties,leads,crmReady]=await Promise.all([
  prisma.property.findMany({where:{tenantId:admin.tenantId,assignedAgentId:id},
   select:{id:true,refCode:true,title:true,city:true,published:true,slug:true},
   orderBy:{updatedAt:"desc"},take:100}),
  prisma.lead.findMany({where:{tenantId:admin.tenantId,assignedAgentId:id},
   select:{id:true,name:true,createdAt:true,property:{select:{refCode:true}}},
   orderBy:{createdAt:"desc"},take:15}),
  crmTablesReady()
 ]);
 const manage=admin.roles.includes("admin");
 return <section className="agent-profile">
  <p><Link href={manage?"/admin/clientes-agentes":"/admin"} className="inline-link"><ArrowLeft size={16}/> Volver</Link></p>
  <div className="admin-heading"><div><h1>{agent.name}</h1><p>Perfil del agente comercial · {agent.active?"Cuenta activa":"Cuenta inactiva"}</p></div><Link className="btn wizard-back" href={"/admin/reportes/agentes?agente="+encodeURIComponent(agent.id)}>Ver rendimiento</Link></div>
  <div className="agent-profile-summary">
   <div><UserRound size={18}/><span>Agente</span><strong>{agent.name}</strong></div>
   <div><Building2 size={18}/><span>Propiedades asignadas</span><strong>{properties.length}{properties.length===100?"+":""}</strong></div>
   <div><UsersRound size={18}/><span>Prospectos asignados (recientes)</span><strong>{leads.length}{leads.length===15?"+":""}</strong></div>
  </div>
  <div className="agent-profile-grid">
   <div className="admin-panel">
    <h2>Información del agente</h2>
    <p className="agent-profile-contact"><Mail size={17}/> <a href={"mailto:"+agent.email}>{agent.email}</a></p>
    <p className="property-help">Roles: {parseRoles(agent.role).map(r=>ROLE_LABELS[r]).join(" · ")}</p>
    {manage&&<form method="post" action="/api/admin/users" className="agent-profile-edit">
     <h3>Actualizar datos de acceso</h3>
     <input type="hidden" name="intent" value="profile"/><input type="hidden" name="id" value={agent.id}/>
     <label>Nombre<input name="name" defaultValue={agent.name} required minLength={2} maxLength={120}/></label>
     <label>Correo<input name="email" type="email" defaultValue={agent.email} required maxLength={180}/></label>
     <button className="btn btn-red" type="submit">Guardar perfil</button>
     <small>Al cambiar estos datos se cerrarán las sesiones del agente para proteger su cuenta.</small>
    </form>}
   </div>
   <div className="admin-panel">
    <h2>Propiedades a su cargo</h2>
    {properties.length?<div className="agent-profile-items">{properties.map(p=><div key={p.id}>
     <div><strong>{p.refCode} · {p.title}</strong><small>{p.city} · {p.published?"Publicada":"Borrador"}</small></div>
     {manage?<Link href={"/admin/propiedades/"+encodeURIComponent(p.id)+"/editar"}>Gestionar <ExternalLink size={14}/></Link>:p.published?<Link href={"/propiedades/"+encodeURIComponent(p.slug)} target="_blank">Ver ficha <ExternalLink size={14}/></Link>:null}
    </div>)}</div>:<p className="property-help">Todavía no tiene propiedades asignadas.</p>}
   </div>
   <div className="admin-panel agent-profile-leads">
    <h2>Últimos prospectos asociados</h2>
    <p className="property-help">Son prospectos asignados directamente a este agente, incluso si se reasigna la propiedad o si la consulta es general.</p>
    {leads.length?<div className="agent-profile-items">{leads.map(l=><div key={l.id}>
      <div><strong>{l.name}</strong><small>{l.property?.refCode||"Consulta"} · {l.createdAt.toLocaleDateString("es-NI",{timeZone:"UTC"})}</small></div>
      {crmReady&&<Link href={"/admin/leads/"+encodeURIComponent(l.id)}>Ver ficha <ExternalLink size={14}/></Link>}
    </div>)}</div>:<p className="property-help">No hay prospectos asociados a sus propiedades.</p>}
    {crmReady&&<Link className="inline-link" href="/admin/leads">Ir a seguimiento comercial →</Link>}
   </div>
  </div>
 </section>;
}
