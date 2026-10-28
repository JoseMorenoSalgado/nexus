import Link from "next/link";
import {redirect} from "next/navigation";
import {hasDatabaseConfig} from "@/lib/server-config";
import type {Metadata} from "next";
import {currentAdmin} from "@/lib/auth";

export const dynamic="force-dynamic";
export const metadata:Metadata={robots:{index:false,follow:false,noarchive:true}};

const errors:Record<string,string>={
 config:"La base de datos no está configurada.",
 credenciales:"Correo o contraseña incorrectos. Comprueba los datos del administrador.",
 bloqueado:"Se alcanzó el límite de intentos. Inténtalo nuevamente después de 15 minutos.",
 sesion:"Se verificaron los datos, pero el navegador no conservó la sesión. Comprueba que aceptas cookies y utiliza el mismo dominio HTTPS.",
 dominio:"Este dominio no está vinculado a la organización. Comprueba el dominio configurado en Plesk.",
 origen:"No se pudo validar el origen del formulario. Abre el panel desde su dirección HTTPS oficial.",
 servidor:"No fue posible completar el acceso por un error del servidor. Revisa los registros de Node.js en Plesk.",
 solicitud:"El formulario no pudo procesarse. Actualiza la página e inténtalo de nuevo."
};
export default async function Access({searchParams}:{searchParams:Promise<{error?:string}>}){
 if(!hasDatabaseConfig())redirect("/instalar");
 if(await currentAdmin())redirect("/admin");
 const q=await searchParams;
 const notice=q.error?errors[q.error]||errors.servidor:null;
 return <main className="login-page"><form method="post" action="/api/admin/session" className="login-card">
  <div className="brand"><span className="brand-icon"><img src="/brand/nexus-icon.webp" alt=""/></span><span><strong>NEXUS</strong><small>REAL ESTATE</small></span></div>
  <h1>Acceso administrativo</h1><p>Ingresa tus credenciales para gestionar tu sitio web.</p>
  {notice&&<div className="admin-error" role="alert">{notice}</div>}
  <label>Correo electrónico<input name="email" type="email" autoComplete="username" maxLength={180} required/></label>
  <label>Contraseña<input name="password" type="password" autoComplete="current-password" required/></label>
  <button className="btn btn-red" type="submit">Entrar al panel →</button>
  <Link href="/" className="inline-link">← Regresar al sitio web</Link>
 </form></main>;
}
