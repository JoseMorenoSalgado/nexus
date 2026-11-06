import Link from "next/link";
import {headers} from "next/headers";
import {requireRole} from "@/lib/auth";
import {prisma} from "@/lib/prisma";
import {hasDatabaseConfig} from "@/lib/server-config";
import {publicRequestHostname} from "@/lib/public-request-origin";
import {singleInstallationTenantId} from "@/lib/single-installation";
export const dynamic="force-dynamic";
export const revalidate=0;
type Check={name:string;status:"correcto"|"advertencia"|"error";detail:string};
export default async function Diagnostico(){
 await requireRole(["admin"]);
 const checks:Check[]=[];
 const add=(name:string,status:Check["status"],detail:string)=>checks.push({name,status,detail});
 const raw=process.env.SITE_URL||process.env.APP_URL||process.env.NEXT_PUBLIC_SITE_URL||"";
 let configuredHost="";
 try{
  const url=new URL(raw);
  if(url.protocol!=="https:"||url.pathname!=="/"||url.search||url.hash||url.username||url.password)throw new Error("invalid");
  configuredHost=url.hostname.toLowerCase();
  add("URL pública","correcto","Dominio configurado: "+configuredHost);
 }catch{add("URL pública","error","SITE_URL debe contener la dirección HTTPS oficial, sin rutas ni parámetros.");}
 const requestHost=publicRequestHostname(await headers());
 const bare=(s:string)=>s.replace(/^www\./,"");
 if(configuredHost&&requestHost&&bare(configuredHost)===bare(requestHost))add("Dominio de acceso","correcto","El dominio recibido coincide con la configuración pública.");
 else add("Dominio de acceso","advertencia","No coincide el dominio recibido con SITE_URL. Revisa el proxy HTTPS de Enhance y el dominio principal.");
 if(!hasDatabaseConfig())add("Base de datos","error","No existe configuración de conexión.");
 else{
  try{
   const rows=await prisma.tenant.findMany({select:{id:true,active:true},take:3});
   const tenantId=await singleInstallationTenantId();
   add("Organización de la instalación",tenantId?"correcto":"error",tenantId?"Se encontró exactamente una organización.":"Se encontraron "+(rows.length===3?"3 o más":rows.length)+" organizaciones; el sitio público requiere exactamente una en esta instalación.");
   if(tenantId)add("Organización activa",rows[0]?.active?"correcto":"error",rows[0]?.active?"La organización está activa.":"La organización está desactivada y el sitio público no se mostrará.");
   await prisma.sitePage.findFirst({select:{slug:true}});
   add("Lectura de páginas","correcto","La consulta de contenido público responde.");
  }catch(e){add("Base de datos / esquema","error","Falló una consulta. Revisa los registros del servidor Node.js. Tipo: "+(e instanceof Error?e.name:"desconocido"));}
 }
 return <section className="system-diagnostics">
  <div className="admin-heading"><div><Link href="/admin/sistema" className="inline-link">Volver a Sistema</Link><h1>Diagnóstico de la página pública</h1><p>Comprobaciones de solo lectura. No modifica organizaciones, usuarios ni propiedades.</p></div></div>
  <div className="admin-panel"><h2>Estado de la instalación</h2><div className="system-schema-list">{checks.map(c=><div key={c.name}><span>{c.status==="correcto"?"✓":c.status==="error"?"✕":"!"} {c.name}</span><strong>{c.status}</strong><p>{c.detail}</p></div>)}</div></div>
  <div className="admin-panel"><h2>Diagnóstico de errores del navegador</h2><p>Estas comprobaciones se ejecutan en el servidor. Un error de hidratación o JavaScript del navegador requiere captura adicional desde el cliente; esta versión no registra todavía excepciones de usuarios.</p><p>Si la página pública falla después de estas verificaciones, consulta la consola del navegador y los logs de Enhance. No publiques contraseñas ni cadenas de conexión.</p><p><a href="/" target="_blank" rel="noopener noreferrer" className="inline-link">Abrir página pública</a></p></div>
 </section>;
}
