import Link from "next/link";
import {isStandaloneMode} from "@/lib/installation-mode";
import {notFound} from "next/navigation";
import {requireStandaloneRole} from "@/lib/independent-auth";
import {listStandaloneLeads,listStandaloneAgents,listStandaloneAgenda} from "@/lib/independent-repositories";
import {StandaloneOperations} from "./standalone-operations";
export const dynamic="force-dynamic";
export default async function Operations(){
 if(!isStandaloneMode())notFound();
 await requireStandaloneRole(["admin","editor"]);
 const [leads,agents,agenda]=await Promise.all([listStandaloneLeads(),listStandaloneAgents(),listStandaloneAgenda()]);
 return <main className="mx-auto max-w-6xl px-5 py-12"><h1 className="text-3xl font-bold">Gestión inmobiliaria · Nexus</h1><p className="mt-2">Propiedades, prospectos, agentes y agenda conectados a PostgreSQL</p>
 <p className="mt-4"><Link href="/admin/propiedades" className="inline-link">Gestionar propiedades</Link></p>
 <StandaloneOperations leads={leads.map(l=>({id:l.id,name:l.name,status:l.crm?.status||"nuevo",assignedAgentId:l.assignedAgentId||""}))} agents={agents.map(a=>({id:a.id,name:a.name}))} agenda={agenda.map(a=>({id:a.id,title:a.title,leadId:a.leadId,startsAt:a.startsAt.toISOString(),location:a.location||""}))}/>
 </main>;
}