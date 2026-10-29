import Link from "next/link";
import {ArrowLeft,Mail,ShieldCheck,Info} from "lucide-react";
import {requireRole} from "@/lib/auth";
import {integrationsForTenant,smtpValid,captchaValid} from "@/lib/integration-config";
import "./integraciones.css";

export const dynamic="force-dynamic";
export default async function Integraciones({searchParams}:{searchParams:Promise<{status?:string}>}){
 const admin=await requireRole(["admin"]);
 const q=await searchParams;
 let config:ReturnType<typeof integrationsForTenant>|null=null,loadError=false;
 try{config=integrationsForTenant(admin.tenantId);}
 catch{loadError=true;}
 const smtp=config?.smtp,captcha=config?.captcha;
 const smtpActive=smtp? smtpValid(smtp):false;
 const captchaActive=captcha?captchaValid(captcha):false;
 const alerts:Record<string,string>={
  "smtp-saved":"La configuración de SMTP se guardó en el almacenamiento privado.",
  "captcha-saved":"La configuración de reCAPTCHA se guardó.",
  "smtp-invalid":"Comprueba host, puerto, remitente, destinatario y credenciales SMTP.",
  "captcha-invalid":"Para activar reCAPTCHA, proporciona las claves pública y privada.",
  invalid:"Hay campos inválidos o demasiado largos.",
  "storage-error":"No fue posible guardar la configuración. Revisa APP_CONFIG_DIR y sus permisos en Plesk."
 };
 return <div className="integration-page">
  <div className="admin-heading"><div>
   <Link href="/admin" className="inline-link"><ArrowLeft size={16}/> Resumen</Link>
   <h1>Correo y seguridad</h1>
   <p>Configura notificaciones SMTP y protege el acceso administrativo con reCAPTCHA.</p>
  </div></div>
  {q.status&&<p className={q.status.endsWith("saved")?"property-success":"admin-error"} role="status">{alerts[q.status]||alerts.invalid}</p>}
  {loadError&&<p className="admin-error" role="alert">La configuración privada no está disponible. Comprueba que APP_CONFIG_DIR sea una ruta absoluta, privada y escribible fuera de httpdocs.</p>}
  <div className="integration-warning"><Info size={20} aria-hidden="true"/><p>Solo los administradores pueden modificar estos ajustes. Las contraseñas no se muestran después de guardarlas y nunca se almacenan en GitHub. Conserva un respaldo del directorio privado.</p></div>
  <div className="integration-grid">
   <section className="admin-panel integration-card">
    <div className="integration-head"><Mail size={22} aria-hidden="true"/><div><h2>Correo SMTP</h2>
     <p>Envía avisos de agenda desde una cuenta de correo autorizada.</p></div></div>
    <span className={"integration-state "+(smtpActive?"is-enabled":"")}>{smtpActive?"Configurado y activado":"Sin activar"}</span>
    <form method="post" action="/api/admin/integraciones" className="integration-form">
     <input type="hidden" name="section" value="smtp"/>
     <label>Servidor SMTP <input type="text" name="host" maxLength={253} autoComplete="off" defaultValue={smtp?.host||""} placeholder="smtp.ejemplo.com" required/></label>
     <label>Puerto <select name="port" defaultValue={smtp?.port||587}><option value="587">587 — STARTTLS</option><option value="465">465 — TLS directo</option></select></label>
     <label>Usuario SMTP <input name="user" maxLength={180} autoComplete="off" defaultValue={smtp?.user||""} required/></label>
     <label>Contraseña SMTP <input type="password" name="password" maxLength={256} autoComplete="new-password" placeholder={smtp?.password?"Configurada; dejar vacío para conservar":"Escribe la contraseña SMTP"}/></label>
     <label>Correo remitente <input type="email" name="from" maxLength={180} defaultValue={smtp?.from||""} placeholder="notificaciones@tudominio.com" required/></label>
     <label>Correo que recibe avisos <input type="email" name="to" maxLength={180} defaultValue={smtp?.to||""} placeholder="administracion@tudominio.com" required/></label>
     <label className="integration-checkbox"><input type="checkbox" name="enabled" defaultChecked={smtp?.enabled||false}/> Activar envío de avisos SMTP</label>
     <button className="btn btn-red" disabled={loadError} type="submit">Guardar correo SMTP</button>
    </form>
    <p className="property-help">Los avisos se envían al correo interno que indiques, después de guardar o reprogramar una reunión. No se envían correos automáticos al prospecto.</p>
   </section>
   <section className="admin-panel integration-card">
    <div className="integration-head"><ShieldCheck size={22} aria-hidden="true"/><div><h2>reCAPTCHA del login</h2>
     <p>Protege el acceso del administrador frente a intentos automatizados.</p></div></div>
    <span className={"integration-state "+(captchaActive?"is-enabled":"")}>{captchaActive?"Activado":"Sin activar"}</span>
    <p className="property-help">Crea claves <strong>reCAPTCHA v2, casilla «No soy un robot»</strong> para tu dominio en Google. Prueba las claves antes de activar el bloqueo.</p>
    <form method="post" action="/api/admin/integraciones" className="integration-form">
     <input type="hidden" name="section" value="captcha"/>
     <label>Clave del sitio (pública) <input type="text" name="siteKey" maxLength={256} autoComplete="off" defaultValue={captcha?.siteKey||""} placeholder="Clave pública de reCAPTCHA" required/></label>
     <label>Clave secreta <input type="password" name="secretKey" maxLength={256} autoComplete="new-password" placeholder={captcha?.secretKey?"Configurada; dejar vacío para conservar":"Clave privada de Google"}/></label>
     <label className="integration-checkbox"><input type="checkbox" name="enabled" defaultChecked={captcha?.enabled||false}/> Exigir reCAPTCHA al iniciar sesión</label>
     <button className="btn btn-red" disabled={loadError} type="submit">Guardar reCAPTCHA</button>
    </form>
    <p className="property-help">Si activas reCAPTCHA con claves incorrectas, el login se bloqueará. Un administrador con sesión activa puede volver aquí y desactivarlo. En caso de pérdida de acceso, se puede desactivar desde Plesk con <code>NEXUS_DISABLE_CAPTCHA=true</code> y reiniciando Node.js.</p>
   </section>
  </div>
 </div>;
}
