import {notFound} from "next/navigation";
import {requireRole} from "@/lib/auth";
import AgendaClient from "./agenda-client";
export const dynamic="force-dynamic";
export default async function StandaloneAgenda(){
 if(process.env.NEXUS_STANDALONE!=="true")notFound();
 await requireRole(["admin","editor","agente"]);
 return <main><div className="admin-heading"><div><h1>Agenda comercial</h1><p>Actividades vinculadas a prospectos de esta instalación independiente.</p></div></div><AgendaClient/></main>;
}
