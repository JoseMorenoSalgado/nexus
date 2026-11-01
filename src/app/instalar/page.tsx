import "./module-options.css";
import {cookies, headers} from "next/headers";
import {redirect} from "next/navigation";
import {installerAvailable,manualInstallerEnabled} from "@/lib/server-config";
import {automaticInstallerEnabled, validInstallerSession, INSTALLER_SESSION_COOKIE} from "@/lib/installer-session";
import {normalizeSiteHost} from "@/lib/preview";
import InstallerForm from "@/components/installer-form";
import {APP_RELEASE} from "@/lib/release";
import {STEP_COOKIE,validStepProof} from "@/lib/installer-step";
import {whmcsActivationEnabled} from "@/lib/whmcs-activation";

export const dynamic = "force-dynamic";
export default async function InstallPage({searchParams}:{searchParams:Promise<{estado?:string;paso?:string}>}){
 if (!installerAvailable()) redirect("/admin/acceso");
 const hostname = normalizeSiteHost((await headers()).get("host") || "");
 const params = await searchParams;
 const status = params.estado;
 const activationStep = params.paso === "activar" && validStepProof((await cookies()).get(STEP_COOKIE)?.value);
 const enabled = automaticInstallerEnabled();
 const whmcsEnabled = whmcsActivationEnabled();
 const manualEnabled = manualInstallerEnabled();
 const authorized = enabled && validInstallerSession((await cookies()).get(INSTALLER_SESSION_COOKIE)?.value);

 return <main className="install-screen"><div className="install-wrap">
  <header className="install-header"><div className="install-logo">N</div><div><strong>NEXUS Inmobiliaria</strong><span>Asistente de instalación inicial</span></div></header>
  <div className="install-card">
   <div className="install-head"><span className="install-kicker">CONFIGURACIÓN INICIAL</span><h1>Bienvenido a tu plataforma</h1><p>Configura la base de datos, registra tu inmobiliaria y crea el usuario que administrará tu sitio web.</p></div>
   {!authorized
    ? <div className="wizard-error installer-access">
       <strong>Instalación protegida.</strong>
       {!activationStep ? <>
         <p>Resuelve la verificación para continuar con la activación.</p>
         <form className="installer-access-form" action="/api/install/step" method="post">
           <label htmlFor="math-answer">¿Cuánto es 7 × 8?</label>
           <input id="math-answer" name="mathAnswer" type="number" min={0} max={999} required/>
           <button type="submit">Continuar</button>
         </form>
       </> : <>
         <p>{manualEnabled ? "Instalación manual temporal habilitada. Solo continúa desde una red con acceso restringido." : whmcsEnabled ? "Introduce el código de activación generado en el área de clientes de Elearning Cloud." : "Introduce el código privado de activación proporcionado por Elearning Cloud. No lo compartas."}</p>
         <form className="installer-access-form" action="/api/install/session" method="post">
           {manualEnabled ? <input type="hidden" name="manual" value="1"/> : null}
           {!manualEnabled ? <>
           <label htmlFor="setup-token">Código de activación</label>
           <input id="setup-token" name="token" type="password" autoComplete="off" minLength={whmcsEnabled ? 16 : 64} maxLength={whmcsEnabled ? 128 : 64} required/>
           </> : null}
           <button type="submit">{manualEnabled ? "Iniciar instalación manual" : "Activar instalación"}</button>
         </form>
         <a className="installer-back" href="/instalar">Volver</a>
       </>}
       {status === "calculo" ? <p role="alert">Resultado incorrecto. Inténtalo nuevamente.</p> : status === "ocupado" ? <p role="alert">Otra sesión de instalación está activa.</p> : status === "invalido" ? <p role="alert">Código de activación inválido.</p> : status === "origen" ? <p role="alert">No se pudo validar el origen de la solicitud.</p> : status === "almacenamiento" ? <p role="alert">No se pudo crear la sesión privada.</p> : null}
      </div>
    : <InstallerForm domain={hostname}/>}
  </div>
  <p className="install-footer">NEXUS Inmobiliaria · Versión {APP_RELEASE} · Configuración privada.</p>
 </div></main>;
}
