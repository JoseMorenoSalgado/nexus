import {NextRequest,NextResponse} from "next/server";
import {execFile} from "node:child_process";
import {promisify} from "node:util";
import {join} from "node:path";
import {standalonePrismaSchemaFor,type DatabaseEngine} from "@/lib/db-provider";
import {PrismaClient as StandalonePrismaClient} from "@/generated/standalone-postgres";
import {isTemplateKey,type SiteTemplateKey} from "@/lib/site-template-registry";
import {normalizeEnabledModules,type ModuleKey} from "@/lib/tenant-modules-registry";
import {installerOriginAllowed} from "@/lib/installer-origin";
import {buildInstallerDatabaseUrl} from "@/lib/installer-db-url";
import {hashPassword} from "@/lib/auth";
import {installerAvailable,takeInstallLock,saveInstallation,configDir} from "@/lib/server-config";
import {clearInstallerSession,INSTALLER_SESSION_COOKIE} from "@/lib/installer-session";
import {mkdirSync,accessSync,constants} from "node:fs";
import {readJsonObjectLimited,RequestPayloadError} from "@/lib/limited-json";

export const runtime="nodejs";
const execute=promisify(execFile);
type Form={
 dbType:"mariadb"|"mysql"|"postgresql";dbHost:string;dbPort:string;dbName:string;dbUser:string;dbPassword:string;
 institution:string;institutionEmail:string;adminName:string;adminEmail:string;adminPassword:string;templateKey?:SiteTemplateKey;modules?:ModuleKey[];
};
const response=(error:string,status=400)=>NextResponse.json({error},{status,headers:{"Cache-Control":"no-store"}});
const safe=(input:unknown,max=128)=>String(input??"").trim().slice(0,max);
function validate(input:Form){
 const dbType=safe(input.dbType,20)||"mariadb";
 if(dbType!=="postgresql")throw Error("La instalación independiente solo admite PostgreSQL hasta que exista un esquema MariaDB independiente validado.");
 const dbPort=Number(input.dbPort||(dbType==="postgresql"?"5432":"3306"));
 const dbHost=safe(input.dbHost,250).toLowerCase();
 const dbName=safe(input.dbName,64),dbUser=safe(input.dbUser,80);
 const dbPassword=String(input.dbPassword||"");
 const institution=safe(input.institution,140),institutionEmail=safe(input.institutionEmail,180).toLowerCase();
 const adminName=safe(input.adminName,120),adminEmail=safe(input.adminEmail,180).toLowerCase();
 const adminPassword=String(input.adminPassword||"");
 const templateKey=input.templateKey===undefined?"real-estate":input.templateKey;
 if(!isTemplateKey(templateKey))throw Error("Selecciona una plantilla válida.");
 const modules=normalizeEnabledModules(templateKey,input.modules,true);
 if(!Number.isInteger(dbPort)||dbPort<1||dbPort>65535)throw Error("Servidor o puerto de base de datos inválido.");
 if(!/^[a-zA-Z0-9_-]{1,64}$/.test(dbName))throw Error("Nombre de base de datos inválido. Se admiten letras, números, guiones (-) y guiones bajos (_).");
 if(!/^[a-zA-Z0-9_@.-]{1,80}$/.test(dbUser)||!dbPassword||dbPassword.length>256)throw Error("Revisa el usuario y contraseña de la base de datos.");
 if(institution.length<3||adminName.length<2||adminPassword.length<14||adminPassword.length>256)throw Error("Introduce la institución, administrador y una contraseña de al menos 14 caracteres.");
 if(!/^\S+@\S+\.\S+$/.test(institutionEmail)||!/^\S+@\S+\.\S+$/.test(adminEmail))throw Error("Los correos electrónicos no son válidos.");
 const engine:DatabaseEngine=dbType==="postgresql"?"postgresql":"mysql";
 const url=buildInstallerDatabaseUrl({engine,host:dbHost,port:dbPort,dbName,dbUser,dbPassword});
 return {institution,institutionEmail,adminName,adminEmail,adminPassword,url,engine,templateKey,modules};
}
function databaseError(error:unknown,engine:DatabaseEngine){
 const code=typeof error==="object"&&error?(("code" in error&&String(error.code))||("errorCode" in error&&String(error.errorCode))||""):"";
 if(code==="P1000")return "Usuario o contraseña incorrectos.";
 if(code==="P1001")return "No se pudo conectar al servidor SQL. Comprueba host, puerto y acceso a la base de datos desde Enhance.";
 if(code==="P1003")return "La base de datos no existe. Créala primero desde el panel de bases de datos de Enhance.";
 if(code==="P1017")return "La conexión a la base de datos se cerró inesperadamente.";
 if(code==="P1014")return "Prisma no encuentra una tabla o relación esperada.";
 if(code==="P2010")return "PostgreSQL rechazó la consulta de comprobación. Revisa el código SQLSTATE en los logs de Enhance.";
 if(code==="P1010")return "El usuario de PostgreSQL no tiene acceso a la base de datos o al esquema public.";
 if(code==="P1002")return "Se agotó el tiempo de conexión a PostgreSQL. Comprueba host y puerto.";
 return `Falló la comprobación de ${engine==="postgresql"?"PostgreSQL":"MySQL/MariaDB"}${/^P\d{4}$/.test(code)?` (${code})`:""}. Consulta [installer] Database preflight failed en los logs de Enhance.`;
}
export async function POST(req:NextRequest){
 if(!installerAvailable())return response("Esta instalación ya está configurada.",409);

 if(!installerOriginAllowed(req))return response("Origen de instalación no autorizado.",403);
 if(Number(req.headers.get("content-length")||"0")>15000)return response("Solicitud demasiado grande.",413);
 let input:Form;
 try{input=await readJsonObjectLimited(req,15000) as unknown as Form;}
 catch(error){return response(error instanceof RequestPayloadError?error.message:"Solicitud inválida.",error instanceof RequestPayloadError?error.status:400);}
 let data:ReturnType<typeof validate>;
 try{data=validate(input);}catch(e){return response(e instanceof Error?e.message:"Datos incompletos.");}
 let release:undefined|(()=>void);
 try{
  release=takeInstallLock();
 }catch(error){
  const code=error instanceof Error&&"code" in error?String(error.code):"UNKNOWN";
  if(code==="EEXIST")return response("Otra instalación está en curso. Si no hay otra instalación activa, revisa el archivo .installer.lock en APP_CONFIG_DIR.",409);
  console.error("[installer] Failed to acquire installation lock",{code});
  if(code==="EACCES"||code==="EPERM"||code==="EROFS")
   return response("No se puede escribir en el directorio privado de instalación. Revisa APP_CONFIG_DIR y los permisos del usuario Node.js.",500);
  if(code==="ENOENT"||code==="ENOTDIR")
   return response("El directorio privado de instalación no es válido. Revisa APP_CONFIG_DIR.",500);
  return response("No fue posible iniciar la instalación. Consulta [installer] Failed to acquire installation lock en los registros de Enhance.",500);
 }
 try{
  if(!installerAvailable())return response("Esta instalación ya se completó.",409);
  // Fallar antes de cambiar la BD si el volumen de configuración no es escribible.
  mkdirSync(configDir(),{recursive:true,mode:0o700});
  accessSync(configDir(),constants.W_OK);
  // The public installer must never initialize a legacy tenant schema for PostgreSQL.
  if(process.env.NEXUS_STANDALONE!=="true")return response("Configura NEXUS_STANDALONE=true en Enhance y reinicia la aplicación antes de instalar.",422);
  const probe=new StandalonePrismaClient({datasources:{db:{url:data.url}}});
  try{
   const tables=data.engine==="postgresql"
    ? await probe.$queryRaw<Array<{n:bigint}>>`SELECT COUNT(*) AS n FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE'`
    : await probe.$queryRaw<Array<{n:bigint}>>`SELECT COUNT(*) AS n FROM information_schema.tables WHERE table_schema = DATABASE() AND table_type = 'BASE TABLE'`;
   if(Number(tables[0]?.n||0)!==0){
    if(data.engine!=="postgresql")return response("Utiliza una base de datos vacía y exclusiva para esta instalación.",409);
    // Allow only a failed standalone schema push with completely empty Nexus tables.
    const rows=await probe.$queryRaw<Array<{table_name:string}>>`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE'`;
    const allowed=new Set(["Property","Photo","Lead","VisitEvent","SitePage","AdminUser","AdminSession","AdminLoginThrottle","LeadCrm","LeadNote","LeadAssignmentHistory","AgendaEvent","CommercialClosing","CommissionPayment","PropertySequence","LeadSource","LeadPropertyHistory","SiteConfig"]);
    if(rows.some(row=>!allowed.has(row.table_name)))return response("La base contiene tablas ajenas al esquema independiente de Nexus. No se modificarán.",409);
    for(const row of rows){
     const populated=await probe.$queryRawUnsafe<Array<{has_rows:boolean}>>(`SELECT EXISTS(SELECT 1 FROM "public"."${row.table_name}") AS has_rows`);
     if(populated[0]?.has_rows)return response("La base contiene registros. No se sobrescribirá ni reinicializará.",409);
    }
   }
   if(data.engine==="postgresql"){
    const privileges=await probe.$queryRaw<Array<{can_connect:boolean;can_create:boolean;can_use:boolean}>>`SELECT has_database_privilege(current_user,current_database(),'CONNECT') AS can_connect, has_schema_privilege(current_user,'public','CREATE') AS can_create, has_schema_privilege(current_user,'public','USAGE') AS can_use`;
    const rights=privileges[0];
    if(!rights?.can_connect||!rights.can_create||!rights.can_use){
     console.error("[installer] PostgreSQL schema permissions insufficient",{canConnect:rights?.can_connect,canCreate:rights?.can_create,canUse:rights?.can_use});
     return response("El usuario PostgreSQL no tiene permisos USAGE y CREATE sobre el esquema public de esta base. Solicita al administrador de PostgreSQL que los conceda.",422);
    }
   }
  }catch(error){
   const code=typeof error==="object"&&error!==null&&"code" in error?String(error.code):"unknown";
   const meta=typeof error==="object"&&error!==null&&"meta" in error?error.meta:null;
   const sqlState=meta&&typeof meta==="object"&&"code" in meta?String(meta.code):undefined;
   console.error("[installer] Database preflight failed",{
    engine:data.engine,
    transport:data.url.includes("?host=")?"unix-socket":"tcp",
    code:/^P\d{4}$/.test(code)?code:"unknown",
    sqlState:/^[A-Z0-9]{5}$/.test(sqlState||"")?sqlState:undefined,
    errorType:error instanceof Error&&/^[A-Za-z]+$/.test(error.name)?error.name:"unknown"
   });
   return response(databaseError(error,data.engine),422);
  }
  finally{await probe.$disconnect();}
  try{
   await execute(process.execPath,[join(process.cwd(),"node_modules","prisma","build","index.js"),"db","push","--skip-generate","--schema="+(standalonePrismaSchemaFor(data.engine))],{
    cwd:process.cwd(),
    env:{...process.env,DATABASE_URL:data.url},
    timeout:120000,maxBuffer:512000
   });
  }catch(error){
   const details=error instanceof Error?error.message:String(error);
   const stderr=typeof error==="object"&&error!==null&&"stderr" in error?String(error.stderr):"";
   const diagnostic=(stderr+"\n"+details).slice(0,12000);
   const codes=[...diagnostic.matchAll(/\b(?:P10\d{2}|P20\d{2}|ERROR:\s*permission denied|permission denied for schema public|must be owner of|relation .* already exists|database .* does not exist|password authentication failed|ECONNREFUSED|ETIMEDOUT)\b/gi)].map(x=>x[0]).slice(0,5);
   console.error("[installer] Prisma db push failed",{
    engine:data.engine,
    errorCode:typeof error==="object"&&error!==null&&"code" in error?String(error.code):undefined,
    signal:typeof error==="object"&&error!==null&&"signal" in error?String(error.signal):undefined,
    indicators:codes,
    // Never log Prisma stderr or connection strings: they may contain credentials.
   });
   if(/permission denied for schema public|permission denied|must be owner of/i.test(diagnostic))
    return response("El usuario PostgreSQL no tiene permisos para crear o modificar tablas en el esquema public. Revisa permisos CREATE/USAGE y propiedad del esquema.",422);
   if(/already exists|P1014|P3005/i.test(diagnostic))
    return response("Se detectaron objetos o un esquema incompatible. Comprueba que la base de datos esté completamente vacía.",422);
   if(/P1000|password authentication failed/i.test(diagnostic))
    return response("PostgreSQL rechazó las credenciales del usuario de la base de datos.",422);
   if(/P1001|ECONNREFUSED|ETIMEDOUT/i.test(diagnostic))
    return response("Prisma no puede conectar con PostgreSQL. Verifica el servidor, puerto y acceso de red.",422);
   if(/P1003|database .* does not exist/i.test(diagnostic))
    return response("La base de datos indicada no existe en PostgreSQL.",422);
   return response("Prisma no pudo crear las tablas. Consulta los registros de Node.js en Enhance: [installer] Prisma db push failed.",422);
  }
  if(data.engine==="postgresql"){
   const db=new StandalonePrismaClient({datasources:{db:{url:data.url}}});
   try{
    await db.$transaction(async tx=>{
     const realEstate=data.templateKey==="real-estate";
     await tx.siteConfig.create({data:{id:"main",name:data.institution,contactEmail:data.institutionEmail,tagline:realEstate?"Pensando en tu futuro":null,primaryColor:realEstate?"#cf202b":"#203F63"}});
     await tx.sitePage.create({data:{slug:"site-template",title:"Plantilla del sitio",blocks:{key:data.templateKey,contentByTemplate:{}},published:true}});
     await tx.sitePage.create({data:{slug:"site-modules",title:"Módulos de la empresa",blocks:{version:1,byTemplate:{[data.templateKey]:data.modules}},published:false}});
     await tx.adminUser.create({data:{name:data.adminName,email:data.adminEmail,passwordHash:hashPassword(data.adminPassword),role:"admin"}});
     await tx.propertySequence.create({data:{id:"main"}});
    });
    const [config,admin]=await Promise.all([db.siteConfig.findUnique({where:{id:"main"}}),db.adminUser.findUnique({where:{email:data.adminEmail}})]);
    if(!config||!admin||!admin.active)return response("La instalación independiente no superó la verificación inicial.",500);
   }catch(error){
    const prismaCode=typeof error==="object"&&error!==null&&"code" in error&&/^P\d{4}$/.test(String(error.code))?String(error.code):null;
    const diagnosticId="NEXUS-SEED-"+(prismaCode||"UNKNOWN");
    const prismaMeta=typeof error==="object"&&error!==null&&"meta" in error?error.meta:null;
    const model=prismaMeta&&typeof prismaMeta==="object"&&"modelName" in prismaMeta?String(prismaMeta.modelName).slice(0,60):undefined;
    console.error("[installer] Standalone seed failed",{diagnosticId,prismaCode,model,errorType:error instanceof Error?error.name:"unknown"});
    return response("No fue posible inicializar el sitio independiente. Código: "+diagnosticId+". No repitas sin revisar el estado de la base.",500);
   }finally{await db.$disconnect();}
   try{saveInstallation(data.url);}
   catch{return response("La base fue preparada, pero no pudo guardarse la configuración persistente.",500);}
   clearInstallerSession();
   const result=NextResponse.json({ok:true,redirectTo:"/admin/acceso?installed=1"},{headers:{"Cache-Control":"no-store"}});
   result.cookies.delete(INSTALLER_SESSION_COOKIE);
   return result;
  }
 }finally{release?.();}
}
