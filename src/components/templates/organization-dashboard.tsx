import Link from "next/link";
import {ArrowUpRight,FileText,UsersRound,Eye,MessageCircle,Settings} from "lucide-react";
import {prisma} from "@/lib/prisma";
import {getTenantModules} from "@/lib/tenant-modules";
import {leadWhere,type AgentScope} from "@/lib/agent-scope";

/** General-purpose dashboard; contacts remain tenant/agent scoped. */
export async function OrganizationDashboard({user}:{user:AgentScope&{tenantName:string}}){
 const modules=await getTenantModules(user.tenantId);
 const inquiriesEnabled=modules.includes("inquiries");
 const month=new Date(Date.now()-30*86400000);
 const scope=leadWhere(user);
 const [inquiries,views,whatsApp,pages,latest]=await Promise.all([
  prisma.lead.count({where:{...scope,createdAt:{gte:month}}}),
  prisma.visitEvent.count({where:{tenantId:user.tenantId,kind:"view",createdAt:{gte:month}}}),
  prisma.visitEvent.count({where:{tenantId:user.tenantId,kind:"whatsapp",createdAt:{gte:month}}}),
  prisma.sitePage.count({where:{tenantId:user.tenantId,published:true,
   OR:[{slug:{in:["home","nosotros","servicios","contacto"]}},{slug:{startsWith:"pagina-"}}]}}),
  prisma.lead.findMany({where:scope,select:{id:true,name:true,createdAt:true,message:true},orderBy:{createdAt:"desc"},take:5})
 ]);
 const cards=[
  {label:"Consultas",value:inquiries,hint:"Últimos 30 días",Icon:UsersRound},
  {label:"Visitas",value:views,hint:"Últimos 30 días",Icon:Eye},
  {label:"WhatsApp",value:whatsApp,hint:"Clics en 30 días",Icon:MessageCircle},
  {label:"Páginas",value:Math.max(pages,1),hint:"Sitio de la organización",Icon:FileText}
 ].filter(c=>c.label!=="Consultas"||inquiriesEnabled);
 return <>
  <div className="admin-heading"><div><h1>Resumen de {user.tenantName}</h1>
   <p>Consultas de visitantes, actividad del sitio y accesos para administrar tu contenido.</p></div>
   {user.roles.some(r=>r==="admin"||r==="editor")&&<Link href="/admin/personalizar/inicio" className="btn btn-red"><Settings size={17}/> Mi sitio web</Link>}
  </div>
  <div className="metric-grid">{cards.map(c=><div className="metric-card" key={c.label}>
   <div className="metric-label"><span>{c.label}</span><span className="metric-icon"><c.Icon size={19}/></span></div>
   <strong>{c.value.toLocaleString("es")}</strong><small>{c.hint}</small>
  </div>)}</div>
  <div className="admin-panels">{inquiriesEnabled&&<section className="admin-panel">
   <div className="heading-row"><h2>Consultas recientes</h2><Link href="/admin/leads" className="inline-link">Ver todas <ArrowUpRight size={16}/></Link></div>
   {latest.length?<div className="dashboard-simple-list">{latest.map(lead=><Link href={"/admin/leads/"+encodeURIComponent(lead.id)} key={lead.id}>
    <span><strong>{lead.name}</strong><small>{lead.createdAt.toLocaleDateString("es",{timeZone:"UTC"})} · {lead.message?.slice(0,75)||"Solicitud de información"}</small></span><ArrowUpRight size={16}/></Link>)}</div>:
    <p className="admin-empty">Las solicitudes enviadas desde el formulario aparecerán aquí.</p>}
  </section>}
  {user.roles.some(r=>r==="admin"||r==="editor")&&<section className="admin-panel">
   <div className="heading-row"><h2>Administrar web</h2><Link href="/" target="_blank" rel="noopener noreferrer" className="inline-link">Ver sitio <ArrowUpRight size={16}/></Link></div>
   <div className="dashboard-simple-list">
    <Link href="/admin/personalizar/plantilla"><span><strong>Plantilla y portada</strong><small>Cambiar diseño y editar el contenido principal</small></span><ArrowUpRight size={16}/></Link>
    <Link href="/admin/personalizar/paginas"><span><strong>Páginas</strong><small>Editar páginas y gestionar publicación</small></span><ArrowUpRight size={16}/></Link>
    <Link href="/admin/personalizar/menu"><span><strong>Menú principal</strong><small>Organizar los enlaces públicos</small></span><ArrowUpRight size={16}/></Link>
   </div>
  </section>}
  </div>
 </>;
}
