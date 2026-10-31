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
 if (enabled && !authorized && status !== "ocupado" && status !== "almacenamiento") redirect("/api/install/session");
 return <main className="install-screen"><div className="install-wrap">
  <header className="install-header"><div className="install-logo">N</div><div><strong>NEXUS Inmobiliaria</strong><span>Asistente de instalación inicial</span></div></header>
  <div className="install-card">
   <div className="install-head"><span className="install-kicker">CONFIGURACIÓN INICIAL</span><h1>Bienvenido a tu plataforma</h1><p>Configura la base de datos, registra tu inmobiliaria y crea el usuario que administrará tu sitio web.</p></div>
   {!enabled
    ? <div className="wizard-error"><strong>Instalador protegido.</strong> Para habilitar la primera instalación, configura temporalmente <code>INSTALLER_AUTO_SETUP=true</code> en el entorno privado del proceso Node.js de Enhance. Restringe el acceso público al asistente mientras se instala. Tras finalizar, el registro privado de instalación bloquea automáticamente el asistente, incluso si la variable sigue activa.</div>
    : !authorized
     ? <div className="wizard-error"><strong>{status === "ocupado" ? "Otra sesión está realizando la instalación." : "No se pudo preparar la sesión inicial."}</strong> {status === "ocupado" ? "Abre esta página desde el mismo navegador que inició el proceso. Si la sesión expiró, vuelve a intentarlo después de una hora." : "Comprueba que el directorio privado APP_CONFIG_DIR tenga permisos de escritura y no esté expuesto en la web."}</div>
     : <InstallerForm domain={hostname}/>}
  </div>
  <p className="install-footer">NEXUS Inmobiliaria · Versión {APP_RELEASE} · Configuración privada.</p>
 </div></main>;
}
