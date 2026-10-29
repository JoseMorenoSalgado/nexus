import Link from "next/link";
import Script from "next/script";
import {captchaForHost} from "@/lib/recaptcha";
import {headers} from "next/headers";
import {normalizeSiteHost} from "@/lib/preview";
import {redirect} from "next/navigation";
import {hasDatabaseConfig} from "@/lib/server-config";
import type {Metadata} from "next";
import {currentAdmin} from "@/lib/auth";

/** Critical styling is deliberately included in the SSR HTML.
 * In some Plesk deployments, stale /_next/static CSS paths are cached after
 * a build while Passenger still runs the old process. The login must remain
 * readable, accessible and branded even if a stylesheet request fails.
 * This CSS contains no tenant data or external resources.
 */
const criticalLoginCss=`
html,body{margin:0;padding:0}
.login-page{box-sizing:border-box;min-height:100vh;min-height:100dvh;display:grid;place-items:center;padding:24px 16px;background:linear-gradient(145deg,#f7f8fa,#edf0f4);font-family:Inter,ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif;color:#202936}
.login-page *{box-sizing:border-box}
.login-page .login-card{display:grid;gap:17px;width:min(440px,100%);padding:32px;border:1px solid #e4e7ed;border-radius:18px;background:#fff;box-shadow:0 20px 65px rgba(20,31,49,.09);margin:0}
.login-page .brand{display:flex;align-items:center;gap:14px;min-width:0;line-height:1.1;margin-bottom:5px}
.login-page .brand-icon{display:flex;align-items:center;justify-content:center;flex:0 0 55px;width:55px;height:65px;background:transparent;border:0;border-radius:0}
.login-page .brand-icon img{display:block;width:55px;max-width:100%;height:65px;max-height:100%;object-fit:contain}
.login-page .brand strong{display:block;font-weight:800;font-size:24px;letter-spacing:-.04em;color:#b51e2a}
.login-page .brand small{display:block;margin-top:4px;font-size:10px;font-weight:800;letter-spacing:.18em;color:#637083}
.login-page .login-card h1{font-size:clamp(24px,5vw,30px);letter-spacing:-.03em;line-height:1.2;margin:5px 0 0;color:#202936}
.login-page .login-card p{font-size:14px;line-height:1.6;color:#5f6c7d;margin:0}
.login-page .login-card label{display:grid;gap:8px;font-size:13px;font-weight:700;color:#344156}
.login-page .login-card input:not([type="checkbox"]){display:block;width:100%;min-width:0;min-height:47px;padding:11px 13px;border:1px solid #cdd4dd;border-radius:9px;background:#fff;color:#202936;font:inherit;font-size:15px;outline-offset:2px}
.login-page .login-card input:focus-visible{outline:2px solid #c92635;border-color:#b51e2a}
.login-page .login-card button{display:flex;align-items:center;justify-content:center;width:100%;min-height:49px;border:0;border-radius:9px;background:#c7202d;color:white;font:inherit;font-size:15px;font-weight:750;cursor:pointer;padding:12px 16px}
.login-page .login-card button:hover:not(:disabled){background:#aa1925}
.login-page .login-card button:disabled{opacity:.6;cursor:not-allowed}
.login-page .login-card .admin-error{padding:12px 14px;border:1px solid #fec6cc;border-radius:9px;background:#fff0f1;color:#9c1723;font-size:13px;line-height:1.5}
.login-page .login-card .inline-link{display:inline-flex;justify-self:center;align-items:center;gap:6px;color:#a71b27;text-decoration:none;font-size:13px;font-weight:700}
.login-page .login-card .inline-link:hover{text-decoration:underline}
.login-page .g-recaptcha{max-width:100%;overflow:hidden}
@media(max-width:480px){.login-page{padding:18px 13px}.login-page .login-card{padding:25px 19px;gap:15px;border-radius:15px}.login-page .brand strong{font-size:21px}.login-page .brand-icon{flex-basis:47px;width:47px;height:58px}.login-page .brand-icon img{width:47px;height:58px}}
`;

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
 solicitud:"El formulario no pudo procesarse. Actualiza la página e inténtalo de nuevo.",
 captcha:"No se pudo verificar reCAPTCHA. Completa el desafío y vuelve a intentar.",
 captcha_config:"El captcha no está configurado. Solicita asistencia al administrador del servidor."
};
export default async function Access({searchParams}:{searchParams:Promise<{error?:string}>}){
 if(!hasDatabaseConfig())redirect("/instalar");
 if(await currentAdmin())redirect("/admin");
 const q=await searchParams;
 const notice=q.error?errors[q.error]||errors.servidor:null;
 const loginCaptcha=await captchaForHost(normalizeSiteHost((await headers()).get("host")||""));
 const captcha=loginCaptcha.enabled,siteKey=loginCaptcha.siteKey;
 return <main className="login-page"><style data-nexus-login-critical="1">{criticalLoginCss}</style><form method="post" action="/api/admin/session" className="login-card">
  <div className="brand"><span className="brand-icon"><img src="/brand/nexus-icon.webp" alt=""/></span><span><strong>NEXUS</strong><small>REAL ESTATE</small></span></div>
  <h1>Acceso administrativo</h1><p>Ingresa tus credenciales para gestionar tu sitio web.</p>
  {notice&&<div className="admin-error" role="alert">{notice}</div>}
  <label>Correo electrónico<input name="email" type="email" autoComplete="username" maxLength={180} required/></label>
  <label>Contraseña<input name="password" type="password" autoComplete="current-password" required/></label>
  {captcha&&siteKey&&<><div className="g-recaptcha" data-sitekey={siteKey} aria-label="Verificación de seguridad reCAPTCHA"/><Script src="https://www.google.com/recaptcha/api.js" strategy="afterInteractive"/></>}
  {captcha&&!siteKey&&<p role="alert" className="admin-error">Verificación pendiente de configurar por el administrador.</p>}
  <button className="btn btn-red" type="submit" disabled={captcha&&!siteKey}>Entrar al panel →</button>
  <Link href="/" className="inline-link">← Regresar al sitio web</Link>
 </form></main>;
}
