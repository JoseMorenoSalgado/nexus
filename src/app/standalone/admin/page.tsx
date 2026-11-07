import {notFound} from "next/navigation";
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
  <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
   {([["Propiedades",properties.length],["Prospectos",leads.length],["Agentes",agents.length],["Agenda",agenda.length]] as const).map(([label,count])=>
    <section key={label} className="rounded-xl border p-5"><h2>{label}</h2><p className="text-3xl font-semibold">{count}</p></section>
   )}
  </div>
 </main>;
}
