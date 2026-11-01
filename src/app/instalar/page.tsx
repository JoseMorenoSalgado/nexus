import "./module-options.css";
import {cookies, headers} from "next/headers";
import {redirect} from "next/navigation";
import {installerAvailable} from "@/lib/server-config";
import {automaticInstallerEnabled, validInstallerSession, INSTALLER_SESSION_COOKIE} from "@/lib/installer-session";
import {normalizeSiteHost} from "@/lib/preview";
import InstallerForm from "@/components/installer-form";
import {APP_RELEASE} from "@/lib/release";

export const dynamic = "force-dynamic";
export default async function InstallPage({searchParams}:{searchParams:Promise<{estado?:string}>}){
 if (!installerAvailable()) redirect("/admin/acceso");
 const hostname = normalizeSiteHost((await headers()).get("host") || "");
 const status = (await searchParams).estado;
 const enabled = automaticInstallerEnabled();
 const authorized = enabled && validInstallerSession((await cookies()).get(INSTALLER_SESSION_COOKIE)?.value);

 return <main className="install-screen"><div className="install-wrap">
  <header className="install-header"><div className="install-logo">N</div><div><strong>NEXUS Inmobiliaria</strong><span>Asistente de instalación inicial</span></div></header>
  <div className="install-card">
   <div className="install-head"><span className="install-kicker">CONFIGURACIÓN INICIAL</span><h1>Bienvenido a tu plataforma</h1><p>Configura la base de datos, registra tu inmobiliaria y crea el usuario que administrará tu sitio web.</p></div>
   {!authorized
    ? <div className="wizard-error installer-access"><strong>Instalación protegida.</strong> Introduce el token privado de instalación que se encuentra en <code>~/nexus-runtime/installer-token</code>. No lo compartas ni lo publiques. El asistente quedará bloqueado automáticamente al terminar.
       <form className="installer-access-form" action="/api/install/session" method="post"><label htmlFor="math-answer">Verificación: ¿cuánto es 7 × 8?</label><input id="math-answer" name="mathAnswer" type="number" min={0} max={999} required/><label htmlFor="setup-token">Token de instalación</label><input id="setup-token" name="token" type="password" autoComplete="off" minLength={64} maxLength={64} required /><button type="submit">Autorizar instalación</button></form>
       {status === "calculo" ? <p>Resultado de la multiplicación incorrecto.</p> : status === "ocupado" ? <p>Otra sesión de instalación está activa.</p> : status === "invalido" ? <p>Token inválido. Comprueba que lo copiaste completo.</p> : status === "origen" ? <p>No se pudo validar el origen de la solicitud. Comprueba el dominio y la configuración del proxy.</p> : status === "almacenamiento" ? <p>No se pudo crear la sesión privada.</p> : null}
      </div>
    : <InstallerForm domain={hostname}/>}
  </div>
  <p className="install-footer">NEXUS Inmobiliaria · Versión {APP_RELEASE} · Configuración privada.</p>
 </div></main>;
}
