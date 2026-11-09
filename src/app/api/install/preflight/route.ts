import {NextRequest,NextResponse} from "next/server";
import {randomUUID} from "node:crypto";
import {installerAvailable} from "@/lib/server-config";
import {buildInstallerDatabaseUrl} from "@/lib/installer-db-url";
import {PrismaClient} from "@/generated/standalone-postgres";
import {readJsonObjectLimited} from "@/lib/limited-json";

export const runtime="nodejs";
type Check={key:string;label:string;ok:boolean;detail:string};
const fail=(error:string,status=400)=>NextResponse.json({error},{status,headers:{"Cache-Control":"no-store"}});
export async function POST(req:NextRequest){
 if(!installerAvailable())return fail("El instalador ya no está disponible.",409);
 const site=process.env.SITE_URL?.trim()||"";
 let expected:string;
 try{const u=new URL(site);if(u.protocol!=="https:"||u.pathname!=="/"||u.search||u.hash||u.username||u.password||u.port)throw Error();expected=u.origin;}
 catch{return fail("SITE_URL HTTPS no está configurado correctamente.",422);}
 if(req.headers.get("origin")!==expected||req.headers.get("sec-fetch-site")!=="same-origin")return fail("Origen no autorizado.",403);
 if(Number(req.headers.get("content-length")||"0")>4096)return fail("Solicitud demasiado grande.",413);
 let data:Record<string,unknown>;
 try{data=await readJsonObjectLimited(req,4096) as Record<string,unknown>;}catch{return fail("Datos de conexión inválidos.");}
 const host=String(data.dbHost||"").trim(),port=Number(data.dbPort||5432);
 const name=String(data.dbName||"").trim(),user=String(data.dbUser||"").trim(),password=String(data.dbPassword||"");
 const checks:Check[]=[];
 const add=(key:string,label:string,ok:boolean,detail:string)=>checks.push({key,label,ok,detail});
 let url:string;
 try{url=buildInstallerDatabaseUrl({engine:"postgresql",host,port,dbName:name,dbUser:user,dbPassword:password});add("format","Configuración de conexión",true,"Formato válido");}
 catch(e){add("format","Configuración de conexión",false,e instanceof Error?e.message:"Datos inválidos");return NextResponse.json({ready:false,checks},{headers:{"Cache-Control":"no-store"}});}
 const diagnosticId="NEXUS-DB-"+randomUUID().slice(0,8).toUpperCase();
 const prisma=new PrismaClient({datasources:{db:{url}}});
 try{
  await prisma.$connect();
  add("connection","Conexión y autenticación",true,"PostgreSQL aceptó las credenciales");
  const identity=await prisma.$queryRaw<Array<{database_name:string}>>`SELECT current_database() AS database_name`;
  add("database","Base de datos",identity[0]?.database_name===name,identity[0]?.database_name===name?"Base de datos accesible":"La base de datos conectada no coincide con la solicitada");
  const privileges=await prisma.$queryRaw<Array<{can_connect:boolean;can_use:boolean;can_create:boolean}>>`SELECT has_database_privilege(current_user,current_database(),'CONNECT') AS can_connect,has_schema_privilege(current_user,'public','USAGE') AS can_use,has_schema_privilege(current_user,'public','CREATE') AS can_create`;
  const p=privileges[0];
  add("permissions","Permisos PostgreSQL",Boolean(p?.can_connect&&p.can_use&&p.can_create),p?.can_connect&&p.can_use&&p.can_create?"CONNECT, USAGE y CREATE disponibles":"Faltan permisos CONNECT, USAGE o CREATE sobre public");
  const tables=await prisma.$queryRaw<Array<{table_name:string}>>`SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE'`;
  add("tables","Esquema de instalación",tables.length===0,tables.length===0?"Base de datos vacía":`Se encontraron ${tables.length} tablas; utiliza una base vacía`);
 }catch(e){
  const code=typeof e==="object"&&e?(("code" in e&&String(e.code))||("errorCode" in e&&String(e.errorCode))||"UNKNOWN"):"UNKNOWN";
  const safeCode=/^P\d{4}$/.test(code)?code:"UNKNOWN";
  console.error("[installer] PostgreSQL connection diagnostic",{diagnosticId,code:safeCode,stage:checks.length?checks[checks.length-1].key:"connect"});
  const message:Record<string,string>={P1000:"Credenciales rechazadas por PostgreSQL",P1001:"Servidor inaccesible: revisa host, puerto o socket",P1002:"Tiempo de conexión agotado",P1003:"La base de datos no existe",P1010:"Acceso denegado al usuario",P2010:"Consulta SQL rechazada; revisa permisos"};
  add("database-error","Diagnóstico PostgreSQL",false,(message[safeCode]||"Error de PostgreSQL; revisa el registro de Node.js")+" · "+diagnosticId);
 }finally{await prisma.$disconnect();}
 return NextResponse.json({ready:checks.every(c=>c.ok),checks,diagnosticId},{headers:{"Cache-Control":"no-store"}});
}
