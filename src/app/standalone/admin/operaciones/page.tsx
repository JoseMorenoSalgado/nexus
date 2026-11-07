import {notFound} from "next/navigation";
import {requireStandaloneRole} from "@/lib/standalone/auth";
import {listStandaloneAdminProperties,listStandaloneLeads,listStandaloneAgents,listStandaloneAgenda} from "@/lib/standalone/repositories";
import {StandaloneOperations} from "./standalone-operations";
export const dynamic="force-dynamic";
export default async function Operations(){
 if(process.env.NEXUS_STANDALONE_MODE!=="true")notFound();
 await requireStandaloneRole(["admin","superadmin","editor","agente"]);
 const [properties,leads,agents,agenda]=await Promise.all([listStandaloneAdminProperties(),listStandaloneLeads(),listStandaloneAgents(),listStandaloneAgenda()]);
 return <main className="mx-auto max-w-6xl px-5 py-12"><h1 className="text-3xl font-bold">Gestión inmobiliaria · Nexus</h1><p className="mt-2">Propiedades, prospectos, agentes y agenda conectados a PostgreSQL</p>
 <StandaloneOperations properties={properties.map(p=>({id:p.id,title:p.title,slug:p.slug,city:p.city,neighborhood:p.neighborhood||"",type:p.type,operation:p.operation,price:Number(p.price),description:p.description,published:p.published,assignedAgentId:p.assignedAgentId||"",bedrooms:p.bedrooms||0,bathrooms:p.bathrooms||0,areaM2:p.areaM2||0,photos:p.photos.map(photo=>({id:photo.id,url:photo.url}))}))} leads={leads.map(l=>({id:l.id,name:l.name,status:l.crm?.status||"nuevo",assignedAgentId:l.assignedAgentId||""}))} agents={agents.map(a=>({id:a.id,name:a.name}))} agenda={agenda.map(a=>({id:a.id,title:a.title,leadId:a.leadId,startsAt:a.startsAt.toISOString(),location:a.location||""}))}/>
 </main>;
}