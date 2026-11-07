import {notFound} from "next/navigation";
import Link from "next/link";
import {requireStandaloneRole} from "@/lib/standalone/auth";
import {listStandaloneAdminProperties,listStandaloneLeads,listStandaloneAgents,listStandaloneAgenda,getStandaloneSiteConfig} from "@/lib/standalone/repositories";
export const dynamic="force-dynamic";
export default async function StandaloneDashboard(){
 if(process.env.NEXUS_STANDALONE_MODE!=="true")notFound();
 const admin=await requireStandaloneRole(["admin","superadmin"]);
 const [site,properties,leads,agents,agenda]=await Promise.all([
  getStandaloneSiteConfig(),listStandaloneAdminProperties(),listStandaloneLeads(),listStandaloneAgents(),listStandaloneAgenda()
 ]);
 return <main className="mx-auto max-w-6xl px-5 py-12">
  <h1 className="text-3xl font-bold">{site?.name||"Nexus"} · Administración</h1>
  <p className="mt-2">Sesión de {admin.name}</p>
  <nav className="mt-4 flex gap-4"><Link href="/standalone">Ver página pública</Link><Link href="/standalone/admin/operaciones">Gestionar operaciones</Link></nav>
  <form action="/standalone/salir" method="post" className="mt-4"><button type="submit" className="rounded border px-4 py-2">Cerrar sesión</button></form>
  <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
   {([["Propiedades",properties.length],["Prospectos",leads.length],["Agentes",agents.length],["Agenda",agenda.length]] as const).map(([label,count])=>
    <section key={label} className="rounded-xl border p-5"><h2>{label}</h2><p className="text-3xl font-semibold">{count}</p></section>
   )}
  </div>
 </main>;
}
