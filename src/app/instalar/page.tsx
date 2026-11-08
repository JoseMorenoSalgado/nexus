import "./module-options.css";
import {existsSync,mkdirSync,openSync,closeSync,unlinkSync} from "node:fs";
import {join} from "node:path";
import {randomUUID} from "node:crypto";
import {configDir} from "@/lib/server-config";
import {headers} from "next/headers";
import {redirect} from "next/navigation";
import {installerAvailable} from "@/lib/server-config";


import {normalizeSiteHost} from "@/lib/preview";
import InstallerForm from "@/components/installer-form";
import {APP_RELEASE} from "@/lib/release";



export const dynamic = "force-dynamic";
export default async function InstallPage({searchParams}:{searchParams:Promise<{estado?:string;paso?:string}>}){
 if (!installerAvailable()) redirect("/admin/acceso");
 const hostname = normalizeSiteHost((await headers()).get("host") || "");
 const checks:{label:string;ok:boolean;detail:string}[]=[];
 const standalone=process.env.NEXUS_STANDALONE==="true";
 checks.push({label:"Modo independiente",ok:standalone,detail:standalone?"Activado":"Configura NEXUS_STANDALONE=true y reinicia Node.js."});
 const siteUrl=(process.env.SITE_URL||"").trim();
 let urlValid=false;
 try{const u=new URL(siteUrl);urlValid=u.protocol==="https:"&&u.hostname.toLowerCase()===hostname&&u.pathname==="/"&&!u.search&&!u.hash;}catch{}
 checks.push({label:"Dominio HTTPS",ok:urlValid,detail:urlValid?"Coincide con SITE_URL":"Configura SITE_URL con la dirección HTTPS pública de este dominio."});
 let writable=false;
 try{
  mkdirSync(configDir(),{recursive:true,mode:0o700});
  const probe=join(configDir(),".preflight-"+randomUUID());
  const fd=openSync(probe,"wx",0o600);
  try{closeSync(fd);}finally{unlinkSync(probe);}
  writable=true;
 }catch(error){
  console.error("[installer] Initial configuration directory preflight failed",{code:error instanceof Error&&"code" in error?String(error.code):"UNKNOWN"});
 }
 checks.push({label:"Almacenamiento persistente",ok:writable,detail:writable?"Directorio privado con escritura disponible":"Revisa APP_CONFIG_DIR y los permisos de escritura del usuario Node.js."});
 const locked=existsSync(join(configDir(),".installer.lock"));
 checks.push({label:"Bloqueo de instalación",ok:!locked,detail:locked?"Existe un bloqueo: verifica que no haya otra instalación en curso.":"No se detectó un bloqueo previo."});
 const ready=checks.every(check=>check.ok);



 return <main className="install-screen"><div className="install-wrap">
  <header className="install-header"><div className="install-logo">N</div><div><strong>NEXUS Inmobiliaria</strong><span>Asistente de instalación inicial</span></div></header>
  <div className="install-card">
   <div className="install-head"><span className="install-kicker">CONFIGURACIÓN INICIAL</span><h1>Bienvenido a tu plataforma</h1><p>Configura la base de datos, registra tu inmobiliaria y crea el usuario que administrará tu sitio web.</p></div>
   <section aria-label="Diagnóstico previo" style={{marginBottom:20}}>
   <h2>Comprobación previa del servidor</h2>
   <p>Estas verificaciones se realizan antes de solicitar tus credenciales. No modifican la base de datos.</p>
   <ul>{checks.map(check=><li key={check.label} style={{marginBottom:8}}><strong>{check.ok?"✓":"⚠"} {check.label}:</strong> {check.detail}</li>)}</ul>
   {!ready&&<p role="alert" className="wizard-error">Corrige los problemas anteriores y actualiza esta página antes de continuar.</p>}
  </section>
  <InstallerForm domain={hostname} environmentReady={ready}/>
  </div>
  <p className="install-footer">NEXUS Inmobiliaria · Versión {APP_RELEASE} · Configuración privada.</p>
 </div></main>;
}
