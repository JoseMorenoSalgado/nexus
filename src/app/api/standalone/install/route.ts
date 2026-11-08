import {NextRequest,NextResponse} from "next/server";
import {execFile} from "node:child_process";
import {promisify} from "node:util";
import {join} from "node:path";
import {PrismaClient} from "@/generated/standalone-postgres";
import {buildInstallerDatabaseUrl} from "@/lib/installer-db-url";
import {initializeStandaloneSite} from "@/lib/standalone/installer";
import {installerAvailable,takeInstallLock,saveInstallation,configDir} from "@/lib/server-config";
import {mkdirSync,accessSync,constants} from "node:fs";
import {readJsonObjectLimited} from "@/lib/limited-json";
export const runtime="nodejs";
export const dynamic="force-dynamic";
const execute=promisify(execFile);
const reply=(error:string,status=400)=>NextResponse.json({error},{status,headers:{"Cache-Control":"no-store"}});
export async function POST(req:NextRequest){
 if(process.env.NEXUS_STANDALONE_MODE!=="true")return new Response(null,{status:404});
 if(!installerAvailable())return reply("La instalación ya está configurada.",409);
 let expected:URL;
 try{expected=new URL(process.env.SITE_URL||"");}catch{return reply("Configura SITE_URL con la dirección HTTPS pública.",503);}
 if(expected.protocol!=="https:"||expected.pathname!=="/"||expected.search||expected.hash||expected.username||expected.password||expected.port)return reply("SITE_URL debe ser HTTPS sin ruta ni puerto.",503);
 if(req.headers.get("origin")!==expected.origin)return reply("Origen no autorizado.",403);
 if(Number(req.headers.get("content-length")||0)>12000)return reply("Solicitud demasiado grande.",413);
 let input:Record<string,unknown>;
 try{input=await readJsonObjectLimited(req,12000);}catch{return reply("Solicitud inválida.",400);}
 const str=(key:string,max:number)=>typeof input[key]==="string"?(input[key] as string).trim().slice(0,max):"";
 const dbHost=str("dbHost",250),dbName=str("dbName",64),dbUser=str("dbUser",80),dbPassword=String(input.dbPassword||"");
 const dbPort=Number(input.dbPort||5432);
 const institution=str("institution",140),institutionEmail=str("institutionEmail",180);
 const adminName=str("adminName",120),adminEmail=str("adminEmail",180),adminPassword=String(input.adminPassword||"");
 if(institution.length<3||adminName.length<2||adminPassword.length<14||adminPassword.length>256||!/^\S+@\S+\.\S+$/.test(adminEmail)||!/^\S+@\S+\.\S+$/.test(institutionEmail))return reply("Revisa la inmobiliaria, los correos y la contraseña (mínimo 14 caracteres).");
 let url:string;
 try{url=buildInstallerDatabaseUrl({engine:"postgresql",host:dbHost,port:dbPort,dbName,dbUser,dbPassword});}
 catch(error){return reply(error instanceof Error?error.message:"Datos de PostgreSQL inválidos.");}
 let release:(()=>void)|undefined;
 try{release=takeInstallLock();}catch{return reply("Otra instalación está en curso.",409);}
 try{
  if(!installerAvailable())return reply("Instalación ya configurada.",409);
  mkdirSync(configDir(),{recursive:true,mode:0o700});accessSync(configDir(),constants.W_OK);
  const probe=new PrismaClient({datasources:{db:{url}}});
  try{
   // A previous attempt may have created the standalone schema before bootstrap failed.
   // Retry only if every existing table belongs to this exact schema and has no rows.
   const rows=await probe.$queryRaw<Array<{table_name:string}>>`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE'`;
   const allowed=new Set(["Property","Photo","Lead","VisitEvent","SitePage","AdminUser","AdminSession","AdminLoginThrottle","LeadCrm","LeadNote","LeadAssignmentHistory","AgendaEvent","CommercialClosing","CommissionPayment","PropertySequence","LeadSource","LeadPropertyHistory","SiteConfig"]);
   if(rows.some(row=>!allowed.has(row.table_name)))return reply("La base contiene tablas ajenas a Nexus. Utiliza una base exclusiva y no elimines datos existentes.",409);
   for(const row of rows){
    // Names are from a fixed allowlist, never interpolated from untrusted input.
    const populated=await probe.$queryRawUnsafe<Array<{has_rows:boolean}>>(`SELECT EXISTS(SELECT 1 FROM "public"."${row.table_name}") AS has_rows`);
    if(populated[0]?.has_rows)return reply("La base ya contiene registros. No se sobrescribirá una instalación existente.",409);
   }
   const rights=await probe.$queryRaw<Array<{can_create:boolean;can_use:boolean}>>`SELECT has_schema_privilege(current_user,'public','CREATE') AS can_create,has_schema_privilege(current_user,'public','USAGE') AS can_use`;
   if(!rights[0]?.can_create||!rights[0]?.can_use)return reply("Faltan permisos CREATE/USAGE sobre el esquema public.",422);
  }catch{return reply("No se pudo validar PostgreSQL. Comprueba conexión, credenciales y permisos.",422);}
  finally{await probe.$disconnect();}
  try{
   await execute(process.execPath,[join(process.cwd(),"node_modules","prisma","build","index.js"),"db","push","--skip-generate","--schema=prisma/schema.standalone.postgres.prisma"],{
    cwd:process.cwd(),env:{...process.env,DATABASE_URL:url},timeout:120000,maxBuffer:512000
   });
  }catch(error){
   console.error("[standalone installer] schema push failed",error instanceof Error?error.name:"unknown");
   return reply("No fue posible crear las tablas PostgreSQL. Consulta los logs del servidor.",422);
  }
  // Bootstrap uses the provided URL directly, before installation.json exists.
  try{
   await initializeStandaloneSite({name:institution,contactEmail:institutionEmail,adminName,adminEmail,adminPassword},url);
  }catch(error){
   console.error("[standalone installer] bootstrap failed",error instanceof Error?error.name:"unknown");
   return reply("Las tablas se crearon, pero falló la configuración inicial. No repitas sin revisar la base.",500);
  }
  const verify=new PrismaClient({datasources:{db:{url}}});
  try{
   const [site,admin,sequence]=await Promise.all([
    verify.siteConfig.findUnique({where:{id:"main"},select:{id:true}}),
    verify.adminUser.findUnique({where:{email:adminEmail.toLowerCase()},select:{id:true,active:true}}),
    verify.propertySequence.findUnique({where:{id:"main"},select:{id:true}})
   ]);
   if(!site||!admin?.active||!sequence)return reply("La verificación posterior a la instalación falló.",500);
  }catch{return reply("No se pudo verificar la instalación.",500);}
  finally{await verify.$disconnect();}
  try{saveInstallation(url);}catch{return reply("Instalación creada, pero no se pudo guardar la configuración persistente.",500);}
  return NextResponse.json({ok:true,redirectTo:"/standalone/acceso"},{headers:{"Cache-Control":"no-store"}});
 }finally{release?.();}
}
