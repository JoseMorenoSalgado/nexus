import "./module-options.css";
import {headers} from "next/headers";
import {redirect} from "next/navigation";
import {installerAvailable} from "@/lib/server-config";


import {normalizeSiteHost} from "@/lib/preview";
import InstallerForm from "@/components/installer-form";
import {APP_RELEASE} from "@/lib/release";



export const dynamic = "force-dynamic";
export default async function InstallPage({searchParams}:{searchParams:Promise<{estado?:string;paso?:string}>}){
 if(process.env.NEXUS_STANDALONE_MODE==="true")redirect("/standalone/instalar");
 if (!installerAvailable()) redirect("/admin/acceso");
 const hostname = normalizeSiteHost((await headers()).get("host") || "");



 return <main className="install-screen"><div className="install-wrap">
  <header className="install-header"><div className="install-logo">N</div><div><strong>NEXUS Inmobiliaria</strong><span>Asistente de instalación inicial</span></div></header>
  <div className="install-card">
   <div className="install-head"><span className="install-kicker">CONFIGURACIÓN INICIAL</span><h1>Bienvenido a tu plataforma</h1><p>Configura la base de datos, registra tu inmobiliaria y crea el usuario que administrará tu sitio web.</p></div>
   <InstallerForm domain={hostname}/>
  </div>
  <p className="install-footer">NEXUS Inmobiliaria · Versión {APP_RELEASE} · Configuración privada.</p>
 </div></main>;
}
