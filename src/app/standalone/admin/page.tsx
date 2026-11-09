import {isStandaloneMode} from "@/lib/standalone/mode";
import {notFound} from "next/navigation";
import Link from "next/link";
import {Building2,Users,CalendarDays,Contact,ArrowUpRight} from "lucide-react";
import {requireStandaloneRole} from "@/lib/standalone/auth";
import {listStandaloneAdminProperties,listStandaloneLeads,listStandaloneAgents,listStandaloneAgenda,getStandaloneSiteConfig} from "@/lib/standalone/repositories";
export const dynamic="force-dynamic";
export default async function StandaloneDashboard(){
 if(!isStandaloneMode())notFound();
 const admin=await requireStandaloneRole(["admin","editor"]);
 const [site,properties,leads,agents,agenda]=await Promise.all([getStandaloneSiteConfig(),listStandaloneAdminProperties(),listStandaloneLeads(),listStandaloneAgents(),listStandaloneAgenda()]);
 const metrics=[{title:"Propiedades",count:properties.length,Icon:Building2},{title:"Prospectos",count:leads.length,Icon:Contact},{title:"Agentes",count:agents.length,Icon:Users},{title:"Agenda",count:agenda.length,Icon:CalendarDays}];
 return <main className="admin-panel container" style={{paddingTop:32,paddingBottom:64}}>
  <header style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:16}}>
   <div><span className="nexus-section-kicker">PANEL INMOBILIARIO</span><h1>{site?.name||"Nexus"} · Administración</h1><p>Bienvenido, {admin.name}</p></div>
   <div style={{display:"flex",gap:12,alignItems:"center"}}><Link className="btn btn-red" href="/standalone/admin/operaciones">Gestionar operaciones <ArrowUpRight size={16}/></Link><Link href="/">Ver sitio</Link></div>
  </header>
  <div className="property-grid" style={{marginTop:30,marginBottom:36}}>
   {metrics.map(({title,count,Icon})=><section key={title} className="property-card" style={{padding:24}}><Icon size={25}/><h2 style={{fontSize:17,marginTop:12}}>{title}</h2><strong style={{fontSize:34}}>{count}</strong></section>)}
  </div>
  <section className="admin-panel"><h2>Últimas propiedades</h2>{properties.length?
   <div style={{overflowX:"auto"}}><table style={{width:"100%",textAlign:"left",borderSpacing:"0 12px"}}><thead><tr><th>Referencia</th><th>Propiedad</th><th>Ciudad</th><th>Estado</th></tr></thead><tbody>{properties.slice(0,8).map(p=><tr key={p.id}><td>{p.refCode}</td><td>{p.title}</td><td>{p.city}</td><td>{p.published?"Publicada":"Borrador"}</td></tr>)}</tbody></table></div>:
   <p>No hay propiedades registradas. Puedes crear la primera desde Gestionar operaciones.</p>}</section>
  <form action="/standalone/salir" method="post" style={{marginTop:24}}><button type="submit">Cerrar sesión</button></form>
 </main>;
}
