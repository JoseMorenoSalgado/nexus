import "./module-options.css";
import {cookies, headers} from "next/headers";
import {redirect} from "next/navigation";
import {installerAvailable} from "@/lib/server-config";
import {validInstallerSession, INSTALLER_SESSION_COOKIE} from "@/lib/installer-session";

import {normalizeSiteHost} from "@/lib/preview";
import InstallerForm from "@/components/installer-form";
import {APP_RELEASE} from "@/lib/release";



export const dynamic = "force-dynamic";
export default async function InstallPage({searchParams}:{searchParams:Promise<{estado?:string;paso?:string}>}){
 if (!installerAvailable()) redirect("/admin/acceso");
 const hostname = normalizeSiteHost((await headers()).get("host") || "");
 const params = await searchParams;
 const status = params.estado;
 const cookieStore = await cookies();
 const authorized = validInstallerSession(cookieStore.get(INSTALLER_SESSION_COOKIE)?.value);


 return <main className="install-screen"><div className="install-wrap">
  <header className="install-header"><div className="install-logo">N</div><div><strong>NEXUS Inmobiliaria</strong><span>Asistente de instalación inicial</span></div></header>
  <div className="install-card">
   <div className="install-head"><span className="install-kicker">CONFIGURACIÓN INICIAL</span><h1>Bienvenido a tu plataforma</h1><p>Configura la base de datos, registra tu inmobiliaria y crea el usuario que administrará tu sitio web.</p></div>
   {!authorized ? <div className="installer-access"><h2>Autorizar instalación</h2><p>Primero verifica el acceso y después introduce la clave privada del instalador o el código de activación de WHMCS.</p><form method="post" action="/api/install/step"><label className="wizard-field"><span>Verificación: ¿cuánto es 7 × 8?</span><input name="mathAnswer" inputMode="numeric" required /></label><button className="btn btn-red" type="submit">Verificar acceso</button></form><form method="post" action="/api/install/session"><label className="wizard-field"><span>Clave privada o código de activación</span><input name="token" type="password" autoComplete="off" required /></label><button className="btn btn-red" type="submit">Autorizar instalación</button></form>{status && <p role="alert">No se pudo autorizar la instalación. Comprueba la verificación y la clave de activación.</p>}</div> : <InstallerForm domain={hostname}/>}
  </div>
  <p className="install-footer">NEXUS Inmobiliaria · Versión {APP_RELEASE} · Configuración privada.</p>
 </div></main>;
}
