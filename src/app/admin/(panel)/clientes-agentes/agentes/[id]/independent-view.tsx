import Link from "next/link";
import {notFound} from "next/navigation";
import {requireRole} from "@/lib/auth";
import {getStandalonePrisma} from "@/lib/prisma-standalone";
import {parseRoles,ROLE_LABELS} from "@/lib/roles";
export const dynamic="force-dynamic";
export default async function StandaloneAgent({params}:{params:Promise<{id:string}>}){
 if(process.env.NEXUS_STANDALONE!=="true")notFound();
 const admin=await requireRole(["admin","agente"]);
 const {id}=await params;
 const manager=admin.roles.includes("admin");
 if(!manager&&id!==admin.userId)notFound();
 const db=getStandalonePrisma();
 const agent=await db.adminUser.findUnique({where:{id},select:{id:true,name:true,email:true,role:true,active:true}});
 if(!agent||!parseRoles(agent.role).includes("agente"))notFound();
 const [properties,leads]=await Promise.all([
  db.property.findMany({where:{assignedAgentId:id},select:{id:true,refCode:true,title:true,city:true,published:true,slug:true},orderBy:{updatedAt:"desc"},take:100}),
  db.lead.findMany({where:{assignedAgentId:id},select:{id:true,name:true,createdAt:true,property:{select:{refCode:true}}},orderBy:{createdAt:"desc"},take:15})
 ]);
 return <section className="agent-profile"><p><Link className="inline-link" href={manager?"/admin/clientes-agentes":"/admin"}>Volver</Link></p>
 <div className="admin-heading"><div><h1>{agent.name}</h1><p>Perfil comercial independiente · {agent.active?"Activo":"Inactivo"}</p></div>{admin.userId===id&&<Link className="btn btn-red" href="/admin/propiedades/nueva">Nueva propiedad</Link>}</div>
 <div className="agent-profile-summary"><div><span>Agente</span><strong>{agent.name}</strong></div><div><span>Propiedades asignadas</span><strong>{properties.length}{properties.length===100?"+":""}</strong></div><div><span>Prospectos recientes</span><strong>{leads.length}{leads.length===15?"+":""}</strong></div></div>
 <div className="agent-profile-grid"><div className="admin-panel"><h2>Datos del agente</h2><p><a href={"mailto:"+agent.email}>{agent.email}</a></p><p>Roles: {parseRoles(agent.role).map(r=>ROLE_LABELS[r]).join(" · ")}</p></div>
 <div className="admin-panel"><h2>Propiedades a su cargo</h2>{properties.length?properties.map(p=><p key={p.id}><strong>{p.refCode}</strong> · {p.title} · {p.city} · {p.published?"Publicada":"Borrador"}</p>):<p>No hay propiedades asignadas.</p>}</div>
 <div className="admin-panel"><h2>Prospectos asociados</h2>{leads.length?leads.map(l=><p key={l.id}><strong>{l.name}</strong> · {l.property?.refCode||"Consulta"} · {l.createdAt.toLocaleDateString("es-NI",{timeZone:"UTC"})}</p>):<p>No hay prospectos asignados.</p>}</div></div></section>;
}
