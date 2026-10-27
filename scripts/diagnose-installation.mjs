/**
 * Diagnóstico de la instalación NEXUS (SOLO LECTURA).
 * Ejecutar dentro del contenedor Next.js: node scripts/diagnose-installation.mjs
 * No crea, modifica ni elimina tablas, datos, usuarios o configuración.
 * No imprime contraseñas, nombres de usuario SQL ni cadenas de conexión.
 */
import {existsSync,readFileSync} from "node:fs";
import {resolve,join} from "node:path";

const runtime=resolve(process.env.APP_CONFIG_DIR||join(process.cwd(),".runtime"));
const installPath=join(runtime,"installation.json");
const hasFile=existsSync(installPath);
let stored;
if(hasFile){
 try{
  stored=JSON.parse(readFileSync(installPath,"utf8"));
  if(stored?.version!==1||typeof stored.databaseUrl!=="string"||!stored.databaseUrl){
   throw Error("INVALID_INSTALLATION_CONFIGURATION");
  }
 }catch{
  console.error("CONFIGURATION_UNREADABLE: installation.json existe, pero su contenido no es válido o no puede leerse.");
  process.exit(2);
 }
}
const envUrl=process.env.DATABASE_URL?.trim();
const effectiveUrl=stored?.databaseUrl||envUrl;
const connectionSource=stored?.databaseUrl?"installation.json":"DATABASE_URL";
if(!effectiveUrl){
 console.error("CONFIGURATION_MISSING: no existe installation.json ni DATABASE_URL.");
 process.exit(2);
}
let parsed;
try{parsed=new URL(effectiveUrl);}
catch{
 console.error("CONFIGURATION_INVALID: la cadena de conexión activa no es una URL válida.");
 process.exit(2);
}
const protocol=parsed.protocol;
if(!["mysql:","postgres:","postgresql:"].includes(protocol)){
 console.error("UNSUPPORTED_DATABASE_ENGINE: el protocolo configurado no es compatible.");
 process.exit(2);
}
const databaseName=decodeURIComponent(parsed.pathname.replace(/^\//,""));
console.log("NEXUS · Diagnóstico SQL de solo lectura");
console.log("Origen de la conexión activa:",connectionSource);
console.log("Motor:",protocol.replace(":",""));
console.log("Base activa:",databaseName||"(sin nombre)");
console.log("Host SQL:",parsed.hostname||"(sin host)");
console.log("Dominio esperado: nexusrealestatenicaragua.com");
if(hasFile&&envUrl&&envUrl!==stored.databaseUrl){
 console.log("AVISO: DATABASE_URL es diferente, pero NO se utiliza porque installation.json tiene prioridad.");
}
const modelNames=["Tenant","Domain","AdminUser","SitePage","Property","Photo"];
let db;
try{
 const mod=protocol==="mysql:"?await import("@prisma/client"):await import("../src/generated/postgres/index.js");
 db=new mod.PrismaClient({datasources:{db:{url:effectiveUrl}},log:[]});
 const sql=protocol==="mysql:"
  ? "SELECT TABLE_NAME AS name FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_TYPE = 'BASE TABLE' ORDER BY TABLE_NAME"
  : "SELECT table_name AS name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE' ORDER BY table_name";
 const results=await db.$queryRawUnsafe(sql);
 const names=new Set(results.map(row=>String(row.name)));
 console.log("Tablas existentes:",names.size);
 for(const name of modelNames)console.log(" - "+name+": "+(names.has(name)?"PRESENTE":"FALTA"));
 if(names.size===0){
  console.log("DIAGNÓSTICO: BASE VACÍA. Comprueba si es la base correcta. No crear estructura hasta confirmarlo.");
  process.exitCode=2;
 }else if(!modelNames.every(name=>names.has(name))){
  console.log("DIAGNÓSTICO: ESQUEMA INCOMPLETO O BASE EQUIVOCADA. NO EJECUTAR prisma db push SIN RESPALDO NI VERIFICACIÓN.");
  process.exitCode=2;
 }else{
  const hostname=(process.env.RECOVERY_HOST||"nexusrealestatenicaragua.com").trim().toLowerCase().replace(/:\d+$/,"").replace(/\.$/,"");
  if(!/^[a-z0-9][a-z0-9.-]*$/.test(hostname)){
   console.log("DIAGNÓSTICO: RECOVERY_HOST no es un dominio válido.");
   process.exitCode=2;
  }else{
   const result=await db.domain.findUnique({where:{hostname},select:{tenant:{select:{active:true}}}});
   if(result?.tenant.active)console.log("DIAGNÓSTICO: DOMINIO REGISTRADO Y EMPRESA ACTIVA.");
   else{
    console.log("DIAGNÓSTICO: TABLAS PRESENTES, PERO EL DOMINIO NO ESTÁ VINCULADO A UNA EMPRESA ACTIVA.");
    process.exitCode=2;
   }
  }
 }
}catch(error){
 const code=error&&typeof error==="object"&&"code" in error&&/^P\d{4}$/.test(String(error.code))
  ? String(error.code):"unknown";
 console.error("FALLO DE DIAGNÓSTICO SQL: "+code+". Revisar permisos, motor, red, base y esquema (no se muestran secretos).");
 process.exitCode=2;
}finally{
 if(db)try{await db.$disconnect();}catch{}
}
