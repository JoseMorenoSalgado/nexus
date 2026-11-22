import {notFound} from "next/navigation";
import {requireRole} from "@/lib/auth";
import AgendaClient from "./agenda-client";
export const dynamic="force-dynamic";
export default async function StandaloneAgenda({searchParams}:{searchParams:Promise<{mes?:string;vista?:string;fecha?:string}>}){
 if(process.env.NEXUS_STANDALONE!=="true")notFound();
 await requireRole(["admin","editor","agente"]);
 const q=await searchParams;
 const month=typeof q.mes==="string"&&/^\d{4}-(0[1-9]|1[0-2])$/.test(q.mes)?q.mes:new Date().toISOString().slice(0,7);
 const view=q.vista==="dia"||q.vista==="semana"?q.vista:"mes";
 const date=typeof q.fecha==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(q.fecha)&&q.fecha.slice(0,7)===month&&!Number.isNaN(Date.parse(q.fecha))?q.fecha:undefined;
 return <main><div className="admin-heading"><div><h1>Agenda comercial</h1><p>Actividades vinculadas a prospectos de esta instalación independiente.</p></div></div><AgendaClient month={month} view={view} date={date}/></main>;
}
