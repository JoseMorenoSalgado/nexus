import Link from "next/link";
import {House,Users,Eye,MessageCircle,ArrowUpRight,Plus} from "lucide-react";
import {requireAdmin} from "@/lib/auth";
import {prisma} from "@/lib/prisma";
import {leadWhere,managesAllLeads} from "@/lib/agent-scope";
import {commercialSchemaState} from "@/lib/commercial-schema";
import {CommercialAlertsPreview} from "@/components/commercial-alerts-preview";
import {DashboardAnalytics} from "@/components/dashboard-analytics";
import {firstDayOfSeries,makeDailyMetrics} from "@/lib/dashboard-metrics";
import {getTenantModules} from "@/lib/tenant-modules";
export const dynamic="force-dynamic";
const days=14;
export default async function Dashboard(){
 const admin=await requireAdmin(),tenantId=admin.tenantId;
 const modules=await getTenantModules(tenantId);
 if(!modules.includes("properties"))return <section className="admin-panel">
  <h1>Módulo inmobiliario desactivado</h1>
  <p>Activa Propiedades desde Aplicaciones y módulos para visualizar el panel comercial.</p>
  <Link href="/admin/modulos" className="btn btn-red">Administrar módulos</Link>
 </section>;
 let compatible=false;
 try{
  const state=await commercialSchemaState();
  compatible=state.propertyAgent&&state.leadAgent&&state.leadHistory;
 }catch{compatible=false;}
 if(!compatible)return <section className="admin-panel">
  <h1>Actualización pendiente de la base de datos</h1>
  <p>Esta instalación necesita completar algunas estructuras comerciales para que las páginas del dashboard funcionen correctamente. Tus registros existentes no se han eliminado.</p>
  {admin.roles.includes("admin")?<Link href="/admin/sistema" className="btn btn-red">Abrir diagnóstico y recuperación</Link>:<p>Solicita al administrador de tu empresa que entre en Estado técnico para revisar el esquema.</p>}
 </section>;
 if(admin.roles.includes("agente")&&!managesAllLeads(admin))return <AgentDashboard user={admin}/>;
 const now=new Date();
 const since=new Date(now.getTime()-30*864e5);
 const chartStart=firstDayOfSeries(days,now);
 const [total,leadsCount,viewCount,waCount,props,leads,events,types,leadSeries]=await Promise.all([
  prisma.property.count({where:{tenantId}}),
  prisma.lead.count({where:{tenantId,createdAt:{gte:since}}}),
  prisma.visitEvent.count({where:{tenantId,kind:"view",createdAt:{gte:since}}}),
  prisma.visitEvent.count({where:{tenantId,kind:"whatsapp",createdAt:{gte:since}}}),
  prisma.property.findMany({where:{tenantId},select:{id:true,title:true,refCode:true,published:true},take:4,orderBy:{createdAt:"desc"}}),
  prisma.lead.findMany({where:{tenantId},take:4,orderBy:{createdAt:"desc"},select:{id:true,name:true,createdAt:true,property:{select:{refCode:true}}}}),
  prisma.visitEvent.findMany({where:{tenantId,createdAt:{gte:chartStart}},select:{kind:true,createdAt:true}}),
  prisma.property.groupBy({by:["type"],where:{tenantId},_count:{_all:true}}),
  prisma.lead.findMany({where:{tenantId,createdAt:{gte:chartStart}},select:{createdAt:true}})
 ]);
 const chart=makeDailyMetrics(events,leadSeries,days,now);
 const cards=[
  {label:"Propiedades",value:total,description:"Inmuebles registrados",Icon:House},
  {label:"Prospectos",value:leadsCount,description:"Recibidos en 30 días",Icon:Users},
  {label:"Visitas",value:viewCount,description:"Páginas vistas en 30 días",Icon:Eye},
  {label:"WhatsApp",value:waCount,description:"Clics en 30 días",Icon:MessageCircle}
 ];
 return <>
  <div className="admin-heading"><div><h1>Resumen</h1>
   <p>Lo más importante de tu inmobiliaria en un solo lugar.</p></div>
   {admin.roles.some(role=>["admin","editor"].includes(role))&&<Link href="/admin/propiedades/nueva" className="btn btn-red"><Plus size={17}/> Nueva propiedad</Link>}
  </div>
  <div className="metric-grid">
   {cards.map(x=><div className="metric-card" key={x.label}>
    <div className="metric-label"><span>{x.label}</span><span className="metric-icon"><x.Icon size={19}/></span></div>
    <strong>{x.value.toLocaleString("es")}</strong><small>{x.description}</small>
   </div>)}
  </div>
  <CommercialAlertsPreview user={admin}/>
  <div className="admin-panels">
   <section className="admin-panel" aria-labelledby="recent-properties">
    <div className="heading-row"><h2 id="recent-properties">Propiedades recientes</h2>
     <Link className="inline-link" href="/admin/propiedades">Ver todas <ArrowUpRight size={16}/></Link></div>
    {props.length?<div className="dashboard-simple-list">{props.map(p=>
     <Link href={"/admin/propiedades/"+encodeURIComponent(p.id)+"/editar"} key={p.id}>
      <span><strong>{p.title}</strong><small>Ref. {p.refCode}</small></span>
      <span className={"status-pill"+(p.published?"":" is-draft")}>{p.published?"Publicada":"Borrador"}</span>
     </Link>)}</div>:<p className="admin-empty">Aún no hay propiedades. Usa «Nueva propiedad» para comenzar.</p>}
   </section>
   <section className="admin-panel" aria-labelledby="recent-leads">
    <div className="heading-row"><h2 id="recent-leads">Últimos prospectos</h2>
     <Link className="inline-link" href="/admin/leads">Ver todos <ArrowUpRight size={16}/></Link></div>
    {leads.length?<div className="dashboard-simple-list">{leads.map(l=>
     <Link key={l.id} href={"/admin/leads/"+encodeURIComponent(l.id)}>
      <span><strong>{l.name}</strong><small>{l.property?.refCode||"Consulta general"} · {l.createdAt.toLocaleDateString("es",{timeZone:"UTC"})}</small></span>
      <ArrowUpRight size={16} aria-hidden="true"/>
     </Link>)}</div>:<p className="admin-empty">Los contactos del sitio aparecerán aquí.</p>}
   </section>
  </div>
  <DashboardAnalytics chart={chart} types={types.map(x=>({name:x.type,value:x._count._all}))}/>
 </>;
}

async function AgentDashboard({user}:{user:{tenantId:string;userId:string;name:string;roles:string[]}}){
 const [properties,leads,totalProps,totalLeads]=await Promise.all([
  prisma.property.findMany({where:{tenantId:user.tenantId,assignedAgentId:user.userId},select:{id:true,title:true,refCode:true,slug:true,published:true,city:true},take:8,orderBy:{updatedAt:"desc"}}),
  prisma.lead.findMany({where:leadWhere(user),select:{id:true,name:true,createdAt:true,property:{select:{refCode:true}}},take:8,orderBy:{createdAt:"desc"}}),
  prisma.property.count({where:{tenantId:user.tenantId,assignedAgentId:user.userId}}),
  prisma.lead.count({where:leadWhere(user)})
 ]);
 return <>
  <div className="admin-heading"><div><h1>Mi espacio comercial</h1><p>Hola, {user.name}. Gestiona las consultas vinculadas a tus inmuebles.</p></div><div className="dashboard-agent-links"><Link href={"/admin/clientes-agentes/agentes/"+encodeURIComponent(user.userId)} className="btn wizard-back">Mi perfil</Link><Link className="btn wizard-back" href="/admin/reportes/agentes">Mi rendimiento</Link></div></div>
  <CommercialAlertsPreview user={user}/>
  <div className="metric-grid">
   <div className="metric-card"><div className="metric-label">Propiedades asignadas <House size={19}/></div><strong>{totalProps}</strong><small>Inmuebles a tu cargo</small></div>
   <div className="metric-card"><div className="metric-label">Prospectos asociados <Users size={19}/></div><strong>{totalLeads}</strong><small>Consultas sobre tus propiedades</small></div>
  </div>
  <div className="admin-panels">
   <div className="admin-panel"><div className="heading-row"><h2>Mis propiedades</h2><Link href={"/admin/clientes-agentes/agentes/"+encodeURIComponent(user.userId)} className="inline-link">Ver todas <ArrowUpRight size={15}/></Link></div>
    {properties.length?properties.map(p=><div key={p.id} className="lead-row"><div><strong>{p.refCode} · {p.title}</strong><small>{p.city} · {p.published?"Publicada":"Borrador"}</small></div>{p.published&&<Link className="inline-link" href={"/propiedades/"+encodeURIComponent(p.slug)} target="_blank">Ver ficha</Link>}</div>):<p className="admin-empty">Aún no tienes propiedades asignadas.</p>}
   </div>
   <div className="admin-panel"><div className="heading-row"><h2>Consultas recientes</h2><Link href="/admin/leads" className="inline-link">Ir al CRM <ArrowUpRight size={15}/></Link></div>
    {leads.length?leads.map(l=><div key={l.id} className="lead-row"><div><strong>{l.name}</strong><small>{l.property?.refCode||"Consulta"} · {l.createdAt.toLocaleDateString("es-NI",{timeZone:"UTC"})}</small></div><Link href={"/admin/leads/"+encodeURIComponent(l.id)} className="inline-link">Ver</Link></div>):<p className="admin-empty">No tienes consultas asociadas a tus inmuebles.</p>}
   </div>
  </div>
  <p className="property-help">Las consultas generales sin propiedad y los datos de otros agentes son gestionados por el administrador.</p>
 </>;
}
