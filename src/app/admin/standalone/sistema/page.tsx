import Link from "next/link";
import {headers} from "next/headers";
import {notFound} from "next/navigation";
import {requireRole} from "@/lib/auth";
import {getStandalonePrisma} from "@/lib/prisma-standalone";
export const dynamic="force-dynamic";
type Check={label:string;ok:boolean;detail:string};
export default async function StandaloneSystem(){
 if(process.env.NEXUS_STANDALONE!=="true")notFound();
 await requireRole(["admin"]);
 const checks:Check[]=[];
 const configured=process.env.SITE_URL||"";
 let host="";
 try{const url=new URL(configured);if(url.protocol!=="https:"||url.pathname!=="/"||url.search||url.hash)throw Error("invalid");host=url.hostname.toLowerCase();checks.push({label:"SITE_URL HTTPS",ok:true,detail:"Configurado: "+host});}
 catch{checks.push({label:"SITE_URL HTTPS",ok:false,detail:"Configura SITE_URL con el dominio HTTPS principal."});}
 const h=await headers();
 const requestHost=(h.get("x-forwarded-host")||h.get("host")||"").split(",")[0].trim().split(":")[0].toLowerCase();
 checks.push({label:"Dominio de acceso",ok:!!host&&!!requestHost&&host.replace(/^www\./,"")===requestHost.replace(/^www\./,""),detail:"Compara el dominio público con SITE_URL y revisa el proxy de Enhance."});
 const db=getStandalonePrisma();
 try{
  await db.$queryRaw\`SELECT 1\`;
  checks.push({label:"PostgreSQL",ok:true,detail:"Conexión de lectura satisfactoria."});
  const [config,pages,properties,admins]=await Promise.all([
   db.siteConfig.findUnique({where:{id:"main"},select:{id:true}}),
   db.sitePage.count({where:{published:true}}),
   db.property.count({where:{published:true}}),
   db.adminUser.count({where:{active:true}})
  ]);
  checks.push({label:"Configuración del sitio",ok:!!config,detail:config?"Registro principal disponible.":"No existe la configuración principal."});
  checks.push({label:"Páginas públicas",ok:pages>0,detail:pages+" páginas publicadas."});
  checks.push({label:"Propiedades públicas",ok:properties>0,detail:properties+" propiedades publicadas."});
  checks.push({label:"Administradores y usuarios activos",ok:admins>0,detail:admins+" usuarios activos."});
 }catch(e){console.error("[standalone-system] read",e instanceof Error?e.name:"unknown");checks.push({label:"PostgreSQL / esquema",ok:false,detail:"Falló una consulta. Revisa las variables y los logs del servidor."});}
 return <section className="system-diagnostics"><div className="admin-heading"><div><h1>Estado técnico independiente</h1><p>Comprobaciones de solo lectura, sin tablas Tenant ni Domain.</p></div></div>
 <div className="admin-panel"><h2>Modo de instalación</h2><p>Standalone PostgreSQL activado. Ninguna comprobación modifica datos.</p></div>
 <div className="admin-panel"><h2>Diagnóstico</h2><div className="system-schema-list">{checks.map(c=><div key={c.label}><span>{c.label}</span><strong>{c.ok?"Correcto":"Revisar"}</strong><small>{c.detail}</small></div>)}</div></div>
 <Link className="btn wizard-back" href="/admin">Volver al dashboard</Link>
 </section>;
}
