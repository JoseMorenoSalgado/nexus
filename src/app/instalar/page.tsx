import "./module-options.css";
import {cookies, headers} from "next/headers";
import {redirect} from "next/navigation";
import {installerAvailable} from "@/lib/server-config";
import {automaticInstallerEnabled, validInstallerSession, INSTALLER_SESSION_COOKIE} from "@/lib/installer-session";
import {normalizeSiteHost} from "@/lib/preview";
import InstallerForm from "@/components/installer-form";
import {APP_RELEASE} from "@/lib/release";
import {emailSetupEnabled} from "@/lib/installer-email";

export const dynamic = "force-dynamic";
export default async function InstallPage({searchParams}:{searchParams:Promise<{estado?:string}>}){
 if (!installerAvailable()) redirect("/admin/acceso");
 const hostname = normalizeSiteHost((await headers()).get("host") || "");
 const status = (await searchParams).estado;
 const enabled = automaticInstallerEnabled();
 const emailEnabled = emailSetupEnabled();
 const authorized = enabled && validInstallerSession((await cookies()).get(INSTALLER_SESSION_COOKIE)?.value);

 return <main className="install-screen"><div className="install-wrap">
  <header className="install-header"><div className="install-logo">N</div><div><strong>NEXUS Inmobiliaria</strong><span>Asistente de instalación inicial</span></div></header>
  <div className="install-card">
   <div className="install-head"><span className="install-kicker">CONFIGURACIÓN INICIAL</span><h1>Bienvenido a tu plataforma</h1><p>Configura la base de datos, registra tu inmobiliaria y crea el usuario que administrará tu sitio web.</p></div>
   {!authorized
    ? <div className="wizard-error"><strong>Instalación protegida.</strong> Introduce el token privado de instalación que se encuentra en <code>~/nexus-runtime/installer-token</code>. No lo compartas ni lo publiques. El asistente quedará bloqueado automáticamente al terminar.
       {emailEnabled && <section aria-label="Activación por correo">
        <h2>Activación por correo electrónico</h2>
        <p>Recibirás un código de seis dígitos en el correo autorizado para esta instalación.</p>
        <form action="/api/install/email" method="post">
          <input type="hidden" name="action" value="send"/>
          <label htmlFor="installer-email">Correo autorizado</label>
          <input id="installer-email" name="email" type="email" autoComplete="email" required/>
          <button type="submit">Enviar código</button>
        </form>
        <form action="/api/install/email" method="post">
          <input type="hidden" name="action" value="verify"/>
          <label htmlFor="installer-code">Código recibido</label>
          <input id="installer-code" name="code" inputMode="numeric" pattern="[0-9]{6}" minLength={6} maxLength={6} autoComplete="one-time-code" required/>
          <button type="submit">Verificar y continuar</button>
        </form>
        {status === "correo-enviado" && <p>Si el correo está autorizado, recibirás un código.</p>}
        {status === "correo-espera" && <p>Espera un minuto antes de solicitar otro código.</p>}
        {status === "codigo-invalido" && <p>Código incorrecto o caducado.</p>}
        {status === "correo-error" && <p>No fue posible enviar o verificar el código. Contacta con soporte.</p>}
       </section>}
       <details><summary>Acceso alternativo con token privado</summary>
       <form action="/api/install/session" method="post"><label htmlFor="setup-token">Token de instalación</label><input id="setup-token" name="token" type="password" autoComplete="off" minLength={64} maxLength={64} required /><button type="submit">Autorizar instalación</button></form></details>
       {status === "ocupado" ? <p>Otra sesión de instalación está activa.</p> : status === "invalido" ? <p>Token inválido. Comprueba que lo copiaste completo.</p> : status === "origen" ? <p>No se pudo validar el origen de la solicitud. Comprueba el dominio y la configuración del proxy.</p> : status === "almacenamiento" ? <p>No se pudo crear la sesión privada.</p> : null}
      </div>
    : <InstallerForm domain={hostname}/>}
  </div>
  <p className="install-footer">NEXUS Inmobiliaria · Versión {APP_RELEASE} · Configuración privada.</p>
 </div></main>;
}
