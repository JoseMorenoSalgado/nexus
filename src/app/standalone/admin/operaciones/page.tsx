import {notFound} from "next/navigation";
import {requireStandaloneRole} from "@/lib/standalone/auth";
import {StandaloneOperations} from "./standalone-operations";
export const dynamic="force-dynamic";
export default async function Operations(){
 if(process.env.NEXUS_STANDALONE_MODE!=="true")notFound();
 await requireStandaloneRole(["admin","editor","agente"]);
 return <main className="mx-auto max-w-5xl px-5 py-12"><h1 className="text-3xl font-bold">Operaciones · Nexus</h1><p className="mt-2">Administración independiente PostgreSQL</p><StandaloneOperations/></main>;
}
