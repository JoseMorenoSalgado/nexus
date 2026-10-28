/**
 * Non-destructive Plesk deployment preflight.
 * Reports structure and configuration presence only; never prints secrets,
 * connects to SQL, invokes Prisma migrate or changes the filesystem.
 */
import {existsSync,readFileSync,realpathSync} from "node:fs";
import {resolve,relative,isAbsolute} from "node:path";

const root=resolve(process.cwd());
const errors=[],warnings=[];
const must=(ok,message)=>{if(!ok)errors.push(message);};
const isInside=(child,parent)=>{
 const rel=relative(parent,child);
 return rel===""||(!rel.startsWith("..")&&!isAbsolute(rel));
};
for(const path of ["package.json","next.config.mjs","app.js","plesk-server.cjs","public","prisma/schema.prisma","scripts/generate-prisma-clients.mjs"]){
 must(existsSync(resolve(root,path)),"Falta "+path+" en Application Root.");
}
must(existsSync(resolve(root,".next","BUILD_ID")),"Falta .next/BUILD_ID: ejecutar npm run build.");
must(existsSync(resolve(root,"node_modules","next")),"No está instalado Next.js: ejecutar npm install --include=dev.");
must(existsSync(resolve(root,"node_modules","@prisma","client")),"No está instalado Prisma Client.");
must(existsSync(resolve(root,"node_modules","prisma","build","index.js")),"Falta Prisma CLI, requerido por el instalador.");
if(Number(process.versions.node.split(".")[0])<22)errors.push("NEXUS requiere Node.js 22 o superior.");
const configured=process.env.APP_CONFIG_DIR||".runtime";
const runtime=resolve(root,configured);
const publicRoot=resolve(root,"public");
if(isInside(runtime,publicRoot))errors.push("APP_CONFIG_DIR apunta al Document Root público: no está permitido.");
if(!isAbsolute(configured))warnings.push("APP_CONFIG_DIR usa una ruta relativa. En Plesk se recomienda ruta absoluta fuera de httpdocs.");
if(!existsSync(runtime))warnings.push("APP_CONFIG_DIR aún no existe: crear carpeta privada con permisos de escritura para Node.");
else {
 try {
  const physical=realpathSync(runtime);
  if(isInside(physical,realpathSync(publicRoot)))errors.push("APP_CONFIG_DIR es accesible desde public mediante symlink.");
 } catch {warnings.push("No se pudo comprobar la ruta real de APP_CONFIG_DIR.");}
}
const pkg=JSON.parse(readFileSync(resolve(root,"package.json"),"utf8"));
must(Boolean(pkg.dependencies?.prisma),"Prisma CLI debe estar en dependencies, no solo en devDependencies.");
must(pkg.name==="nexus-real-estate","El paquete tiene una identidad distinta de NEXUS.");
for(const e of errors)console.error("ERROR: "+e);
for(const w of warnings)console.warn("AVISO: "+w);
if(!errors.length)console.log("NEXUS Plesk preflight OK: compilación, arranque y dependencias.");
console.log("Configuración SQL: "+(Boolean(process.env.DATABASE_URL)||existsSync(resolve(runtime,"installation.json"))?"detectada":"pendiente de instalación inicial")+".");
process.exitCode=errors.length?1:0;
