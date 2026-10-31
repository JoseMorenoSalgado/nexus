/** Read-only Enhance preflight. Does not connect to SQL, migrate or print secrets. */
import {existsSync,realpathSync,statSync} from "node:fs";
import {resolve,relative,isAbsolute,join} from "node:path";
import {homedir} from "node:os";
const root=resolve(process.cwd()), errors=[],warnings=[];
const inside=(child,parent)=>{const rel=relative(parent,child);return rel===""||(!rel.startsWith("..")&&!isAbsolute(rel));};
for(const file of ["package.json","next.config.mjs","prisma/schema.prisma","scripts/generate-prisma-clients.mjs"]){
 if(!existsSync(join(root,file)))errors.push("Falta "+file);
}
if(!existsSync(join(root,".next","BUILD_ID")))errors.push("Falta .next/BUILD_ID: ejecutar npm run build.");
if(!existsSync(join(root,"node_modules","next")))errors.push("Falta Next.js: ejecutar npm install.");
if(!existsSync(join(root,"node_modules","@prisma","client")))errors.push("Falta Prisma Client.");
if(Number(process.versions.node.split(".")[0])<22)errors.push("NEXUS requiere Node.js 22 o superior.");
const configured=process.env.APP_CONFIG_DIR?.trim();
const runtime=resolve(configured||join(homedir(),"nexus-runtime"));
if(inside(runtime,root))errors.push("El directorio persistente está dentro del despliegue Git y se puede perder en actualizaciones.");
const publicRoot=join(root,"public");
if(inside(runtime,publicRoot))errors.push("El directorio persistente está dentro de public.");
if(existsSync(runtime)){
 try{
  const physical=realpathSync(runtime);
  if(inside(physical,realpathSync(root)))errors.push("El directorio persistente apunta al despliegue mediante un enlace simbólico.");
  if((statSync(runtime).mode&0o077)!==0)warnings.push("Revisar permisos de nexus-runtime; se recomienda 0700.");
 }catch{warnings.push("No se pudo verificar la ruta persistente.");}
}else warnings.push("El directorio persistente aún no existe; la aplicación debe poder crearlo.");
const installed=join(runtime,"installation.json");
if(existsSync(installed)){
 try{if((statSync(installed).mode&0o077)!==0)errors.push("installation.json debe tener permisos 0600.");}
 catch{warnings.push("No se pudieron comprobar permisos de installation.json.");}
}
if(process.env.INSTALLER_AUTO_SETUP==="true"&& !existsSync(installed)&&!process.env.DATABASE_URL)
 warnings.push("Instalador web habilitado: restringir acceso durante la primera instalación.");
console.log("Directorio persistente: "+runtime);
console.log("Conexión configurada: "+(existsSync(installed)||Boolean(process.env.DATABASE_URL?.trim())?"sí":"no"));
for(const m of warnings)console.warn("AVISO: "+m);
for(const m of errors)console.error("ERROR: "+m);
if(!errors.length)console.log("NEXUS Enhance preflight OK.");
process.exitCode=errors.length?1:0;
