import {redirect,notFound} from "next/navigation";
import {installerAvailable} from "@/lib/server-config";
import {StandaloneInstallerForm} from "./standalone-installer-form";
export const dynamic="force-dynamic";
export default function InstallStandalone(){
 if(process.env.NEXUS_STANDALONE_MODE!=="true")notFound();
 if(!installerAvailable())redirect("/standalone/acceso");
 return <main className="mx-auto max-w-xl px-5 py-12">
  <h1 className="text-3xl font-bold">Instalación inicial de Nexus</h1>
  <p className="mt-3">Base PostgreSQL nueva, sin organizaciones ni dependencias multitenant.</p>
  <StandaloneInstallerForm/>
 </main>;
}
