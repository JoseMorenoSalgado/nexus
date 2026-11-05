/** One-time, explicitly enabled repair of a public domain after Enhance migration.
 * Does not import Next.js server-only modules, so it works in a standalone Node/tsx process.
 */
import {readFileSync,existsSync} from "node:fs";
import {join} from "node:path";
import {homedir} from "node:os";
import {PrismaClient as MysqlClient} from "@prisma/client";
import {PrismaClient as PostgresClient} from "../src/generated/postgres";

function databaseUrl():string {
 const dir=process.env.APP_CONFIG_DIR?.trim()||join(homedir(),"nexus-runtime");
 const file=join(dir,"installation.json");
 if(existsSync(file)){
  const config=JSON.parse(readFileSync(file,"utf8"));
  if(config.version!==1||typeof config.databaseUrl!=="string")throw Error("Configuración persistente inválida");
  return config.databaseUrl;
 }
 const url=process.env.DATABASE_URL?.trim();
 if(!url)throw Error("DATABASE_URL o installation.json requeridos.");
 return url;
}
async function main(){
 const raw=process.env.SITE_URL?.trim();
 const email=process.env.ADMIN_EMAIL?.trim().toLowerCase();
 if(!raw||!email)throw Error("SITE_URL y ADMIN_EMAIL son obligatorios.");
 const site=new URL(raw);
 if(site.protocol!=="https:"||site.username||site.password||site.pathname!=="/"||site.search||site.hash||site.port)
  throw Error("SITE_URL debe ser HTTPS, sin ruta ni puerto.");
 const hostname=site.hostname.toLowerCase().replace(/\\.$/,"");
 if(!/^[a-z0-9][a-z0-9.-]*$/.test(hostname))throw Error("Hostname inválido.");
 const url=databaseUrl();
 const db=/^postgres(ql)?:/i.test(url)
  ? new PostgresClient({datasources:{db:{url}}})
  : /^mysql:/i.test(url)
   ? new MysqlClient({datasources:{db:{url}}})
   : null;
 if(!db)throw Error("Motor de base de datos no reconocido.");
 try{
  const users=await db.adminUser.findMany({
   where:{email,active:true,tenant:{active:true}},
   select:{tenantId:true,tenant:{select:{name:true}}}
  });
  if(users.length!==1)throw Error("ADMIN_EMAIL debe identificar exactamente una organización activa.");
  const tenantId=users[0].tenantId;
  await db.$transaction(async tx=>{
   const existing=await tx.domain.findUnique({where:{hostname},select:{tenantId:true}});
   if(existing&&existing.tenantId!==tenantId)throw Error("Dominio asociado a otra organización. No se modificó.");
   if(!existing)await tx.domain.create({data:{hostname,tenantId}});
  });
  console.log("[domain-repair] OK:",hostname,"organización:",users[0].tenant.name);
 }finally{await db.$disconnect();}
}
main().catch(error=>{
 console.error("[domain-repair] FAILED:",error instanceof Error?error.message:"Error desconocido");
 process.exitCode=1;
});
