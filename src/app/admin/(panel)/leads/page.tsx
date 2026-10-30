import Link from "next/link";
import {Building2,CalendarClock,ChevronRight,ClipboardList,Filter,MessageCircle,Search,Users,UserPlus,X} from "lucide-react";
import {Prisma} from "@prisma/client";
import {requireRole} from "@/lib/auth";
import {getSiteTemplate} from "@/lib/site-template-store";
import {prisma} from "@/lib/prisma";
import {crmTablesReady} from "@/lib/crm-schema";
import {leadWhere,managesAllLeads} from "@/lib/agent-scope";
import {parseRoles} from "@/lib/roles";
import {CRM_STATUSES,crmStatusLabel,isCrmStatus,whatsappLeadUrl} from "@/lib/crm-status";
import {tenantLeadSources} from "@/lib/lead-sources";

export const dynamic="force-dynamic";
type Search={q?:string;status?:string;agent?:string;source?:string;page?:string;activated?:string;error?:string};
const date=(x:Date)=>x.toLocaleDateString("es-NI",{day:"2-digit",month:"short",year:"numeric",timeZone:"UTC"});
export default async function AdminLeads({searchParams}:{searchParams:Promise<Search>}){
 const admin=await requireRole(["admin","editor","agente"]);
 const realEstate=(await getSiteTemplate(admin.tenantId)).key==="real-estate";
 const params=await searchParams;
 const ready=await crmTablesReady();
 const q=(params.q||"").trim().slice(0,80);
 const status=params.status&&isCrmStatus(params.status)?params.status:"";
 const page=Math.min(10000,Math.max(1,Number.parseInt(params.page||"1",10)||1));
 if(!ready)return <>
  <div className="admin-heading"><div><h1>{realEstate?"Prospectos y seguimiento":"Consultas y seguimiento"}</h1><p>{realEstate?"Administra las consultas de tus posibles compradores y arrendatarios.":"Gestiona las solicitudes de información recibidas en tu sitio."}</p></div></div>
  <section className="admin-panel crm-activation">
   <ClipboardList size={35} color="#b81e29"/>
   <h2>Activar seguimiento comercial</h2>
   <p>Conservaremos todos los prospectos actuales y añadiremos tablas independientes para registrar estados, próximas llamadas y notas. Esta ampliación no elimina ni modifica los contactos recibidos.</p>
   {params.error&&<p className="admin-error" role="alert">No fue posible activar el CRM. Comprueba los permisos de creación de tablas de MariaDB en Dokploy.</p>}
   {admin.roles.includes("admin")?<form action="/api/admin/crm/activate" method="post"><button className="btn btn-red">Activar CRM de prospectos</button></form>:<p>Un administrador debe activar la función para empezar a utilizarla.</p>}
  </section>
 </>;
 const sources=await tenantLeadSources(admin.tenantId);
 const selectedSource=sources.some(s=>s.code===params.source)?params.source||"":"";
 const team=managesAllLeads(admin)?await prisma.adminUser.findMany({where:{tenantId:admin.tenantId},select:{id:true,name:true,role:true},orderBy:{name:"asc"}}):[];
 const agents=team.filter(u=>parseRoles(u.role).includes("agente"));
 const agentFilter=params.agent==="none"?"none":agents.some(a=>a.id===params.agent)?params.agent||"":"";
 const filters:Prisma.LeadWhereInput[]=[];
 if(agentFilter)filters.push({assignedAgentId:agentFilter==="none"?null:agentFilter});
 if(selectedSource)filters.push({source:selectedSource});
 if(q)filters.push({OR:[
  {name:{contains:q}},{phone:{contains:q}},{email:{contains:q}},
  {property:{is:{refCode:{contains:q}}}}
 ]});
 if(status==="nuevo")filters.push({OR:[{crm:{is:null}},{crm:{is:{status:"nuevo",tenantId:admin.tenantId}}}]});
 else if(status)filters.push({crm:{is:{status,tenantId:admin.tenantId}}});
 const base=leadWhere(admin);
 const where:Prisma.LeadWhereInput={...base,...(filters.length?{AND:filters}:{})};
 const [total,leads,allCount,managed]=await Promise.all([
  prisma.lead.count({where}),
  prisma.lead.findMany({where,orderBy:{createdAt:"desc"},skip:(page-1)*12,take:12,
   include:{property:{select:{refCode:true,title:true}},assignedAgent:{select:{name:true}},crm:true}}),
  prisma.lead.count({where:base}),
  prisma.leadCrm.groupBy({by:["status"],where:{tenantId:admin.tenantId,...(!managesAllLeads(admin)?{lead:{is:base}}:{})},_count:{_all:true}})
 ]);
 const counts=new Map(managed.map(x=>[x.status,x._count._all]));
 const newCount=allCount-managed.filter(x=>x.status!=="nuevo").reduce((n,x)=>n+x._count._all,0);
 const paramsFor=(p:number)=>{const u=new URLSearchParams();if(q)u.set("q",q);if(status)u.set("status",status);if(agentFilter)u.set("agent",agentFilter);if(selectedSource)u.set("source",selectedSource);u.set("page",String(p));return "/admin/leads?"+u.toString();};
 const hasFilters=Boolean(q||status||agentFilter||selectedSource);
 const canEdit=admin.roles.some(r=>["admin","editor","agente"].includes(r));
 return <>
  <div className="admin-heading"><div><h1>{realEstate?"Prospectos y seguimiento":"Consultas y seguimiento"}</h1><p>{realEstate?"Organiza las consultas inmobiliarias, programa contactos y registra gestiones.":"Organiza las solicitudes de visitantes, programa respuestas y registra gestiones."}</p></div>{canEdit&&<Link href="/admin/leads/nuevo" className="btn btn-red"><UserPlus size={17}/>{realEstate?"Registrar prospecto":"Nueva consulta"}</Link>}</div>
  {params.activated&&<p className="property-success" role="status">CRM activado correctamente. Los contactos anteriores se conservaron.</p>}
  {params.error&&<p className="admin-error" role="alert">No se pudo completar la operación. Comprueba los permisos del usuario.</p>}
  {!managesAllLeads(admin)&&<p className="panel-notice">Mostrando únicamente las consultas que tienes asignadas.</p>}
  {admin.roles.includes("admin")&&<p><Link className="inline-link" href="/admin/leads/canales">Configurar canales de captación</Link></p>}
  <div className="crm-overview crm-overview-compact">
   <div><span>Total de consultas</span><strong>{allCount}</strong><Users size={20}/></div>
   <div><span>{realEstate?"Nuevos prospectos":"Nuevas consultas"}</span><strong>{newCount}</strong><MessageCircle size={20}/></div>
   <div><span>En seguimiento</span><strong>{(counts.get("contactado")||0)+(counts.get("visita")||0)+(counts.get("negociacion")||0)}</strong><CalendarClock size={20}/></div>
  </div>
  <form className={"crm-filters crm-filters-compact"+(managesAllLeads(admin)?" crm-filters-with-agents":"")} method="get" action="/admin/leads">
   <label><span>Buscar contacto</span><div className="property-search"><Search size={17}/><input name="q" placeholder={realEstate?"Nombre, teléfono, correo o referencia":"Nombre, teléfono o correo"} defaultValue={q} maxLength={80}/></div></label>
   <label><span>Estado comercial</span><select name="status" defaultValue={status}>
    <option value="">Todos los estados</option>
    {CRM_STATUSES.map(s=><option value={s.value} key={s.value}>{s.label}</option>)}
   </select></label>
   <label><span>Canal de captación</span><select name="source" defaultValue={selectedSource}><option value="">Todos los canales</option>{sources.map(s=><option key={s.code} value={s.code}>{s.name}</option>)}</select></label>
   {managesAllLeads(admin)&&<label><span>Responsable</span><select name="agent" defaultValue={agentFilter}><option value="">Todos los agentes</option><option value="none">Sin asignar</option>{agents.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</select></label>}
   <div className="admin-filter-actions"><button className="btn btn-dark" type="submit"><Filter size={16}/> Aplicar</button>{hasFilters&&<Link href="/admin/leads" className="admin-clear-filters"><X size={15}/> Limpiar</Link>}</div>
  </form>
  <div className="property-result-heading"><strong>{total} resultados</strong><span>Página {page} de {Math.max(1,Math.ceil(total/12))}</span></div>
  {leads.length?<div className="crm-list crm-list-compact">
   {leads.map(l=>{
    const wa=whatsappLeadUrl(l.phone,admin.tenantName,l.property?.refCode);
    const progress=l.crm;
    return <article key={l.id} className="crm-lead-card">
     <div className="crm-lead-main">
      <div className="crm-avatar" aria-hidden="true">{l.name.slice(0,1).toLocaleUpperCase("es")}</div>
      <div className="crm-lead-name"><strong><Link href={"/admin/leads/"+encodeURIComponent(l.id)}>{l.name}</Link></strong><span>{l.phone}{l.email?" · "+l.email:""}</span><small>{date(l.createdAt)}</small></div>
     </div>
     <div className="crm-lead-property"><Building2 size={15}/><span>{l.property?.refCode?l.property.refCode+" · "+l.property.title:"Consulta general"}</span><small className="crm-assigned-preview">Responsable: {l.assignedAgent?.name||"Sin asignar"}</small></div>
     <div className="crm-lead-side">
      <span className={"crm-status crm-status-"+(progress?.status||"nuevo")}>{crmStatusLabel(progress?.status||"nuevo")}</span>
      {progress?.nextContactAt&&<small>Próximo contacto: {date(progress.nextContactAt)}</small>}
      <div className="crm-lead-actions">
       {wa&&<a href={wa} target="_blank" rel="noopener noreferrer" className="crm-whatsapp-link"><MessageCircle size={16}/> WhatsApp</a>}
       <Link href={"/admin/leads/"+encodeURIComponent(l.id)} className="btn wizard-back">Seguimiento <ChevronRight size={16}/></Link>
      </div>
     </div>
    </article>;
   })}</div>:<div className="property-empty"><Users size={34}/><h2>{hasFilters?"No hay coincidencias":realEstate?"Sin prospectos todavía":"Sin consultas todavía"}</h2><p>{hasFilters?"Prueba con otros filtros.":"Las consultas enviadas desde tu sitio web aparecerán aquí."}</p>{hasFilters&&<Link href="/admin/leads" className="btn wizard-back">Limpiar filtros</Link>}</div>}
  {total>12&&<nav className="property-pagination" aria-label="Paginación de prospectos">
   {page>1&&<Link href={paramsFor(page-1)} className="btn wizard-back">← Anterior</Link>}
   {page*12<total&&<Link href={paramsFor(page+1)} className="btn wizard-back">Siguiente →</Link>}
  </nav>}
  {!canEdit&&<p className="property-help">Tu cuenta puede consultar los prospectos, pero no modificar sus estados ni agregar notas.</p>}
 </>;
}
