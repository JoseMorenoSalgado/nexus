import {headers} from "next/headers";
import {requireRole} from "@/lib/auth";
import {hasDatabaseConfig} from "@/lib/server-config";
import {publicPageHostname} from "@/lib/public-request-origin";
import {singleInstallationTenantId} from "@/lib/single-installation";
import {prisma} from "@/lib/prisma";
import {getPageDefinitions} from "@/lib/site-pages";
import {isAllowedPublicHost} from "@/lib/public-site/host-match";
export const dynamic="force-dynamic";
export default async function DiagnosticsPage(){
 const admin=await requireRole(["admin","superadmin"]);
 const h=await headers();
 const host=publicPageHostname(h);
 const configured=(process.env.SITE_URL||process.env.APP_URL||process.env.NEXT_PUBLIC_SITE_URL||"").trim();
 const databaseConfigured=hasDatabaseConfig();
 let activeTenant:string|null=null;
 let domains:string[]=[];
 let pages:{id:string;published:boolean}[]=[];
 let databaseError=false;
 if(databaseConfigured){
  try{
   activeTenant=await singleInstallationTenantId();
   if(activeTenant===admin.tenantId){
    domains=(await prisma.domain.findMany({where:{tenantId:activeTenant},select:{hostname:true},take:100})).map(d=>d.hostname);
    pages=(await getPageDefinitions(activeTenant)).map(p=>({id:p.id,published:p.published}));
   }
  }catch{databaseError=true;}
 }
 const allowed=Boolean(host&&activeTenant&&isAllowedPublicHost(host,configured,domains));
 const checks=[
  {name:"Base de datos configurada",ok:databaseConfigured},
  {name:"Consulta PostgreSQL / SQL",ok:!databaseError&&Boolean(activeTenant)},
  {name:"Organización activa única",ok:activeTenant===admin.tenantId},
  {name:"Dominio público identificado",ok:Boolean(host)},
  {name:"Dominio público autorizado",ok:allowed},
  {name:"Página Home disponible",ok:pages.some(p=>p.id==="home"&&p.published)},
 ];
 return <main style={{maxWidth:850,margin:"40px auto",padding:24,fontFamily:"system-ui"}}>
  <a href="/admin">← Volver al dashboard</a>
  <h1>Centro de diagnóstico Nexus</h1>
  <p>Resultados de esta solicitud. No se muestran credenciales ni cadenas de conexión.</p>
  <p>Origen público identificado: <strong>{host||"No identificado"}</strong></p>
  <p>SITE_URL: <strong>{configured?"Configurada":"No configurada"}</strong></p>
  <p>Dominios registrados: <strong>{domains.length}</strong></p>
  <h2>Comprobaciones</h2>
  <ul>{checks.map(c=><li key={c.name} style={{padding:8,color:c.ok?"#176a3a":"#a12626"}}>{c.ok?"✓":"✗"} {c.name}</li>)}</ul>
  <h2>Páginas públicas</h2>
  <ul>{pages.map(p=><li key={p.id}>{p.id}: {p.published?"Publicada":"No publicada"}</li>)}</ul>
  <p>Para consultar errores anteriores, busca <code>nexus-public</code> en los registros Node.js de Enhance. Cada evento incluye código, fecha e identificador único.</p>
 </main>;
}
