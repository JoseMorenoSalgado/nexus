#!/usr/bin/env node
/**
 * Enhance runtime configuration lives outside deploys/current and Git.
 * Node >=22 loads it using --env-file, without printing secret values.
 */
import {existsSync,mkdirSync,readFileSync,writeFileSync,renameSync,chmodSync,statSync,realpathSync} from "node:fs";
import {homedir} from "node:os";
import {join,resolve,relative,isAbsolute} from "node:path";
import {spawn} from "node:child_process";
import {randomUUID} from "node:crypto";

const command=process.argv[2];
const root=realpathSync(process.cwd());
const dir=resolve(process.env.APP_CONFIG_DIR?.trim()||join(homedir(),"nexus-runtime"));
const file=join(dir,"enhance.env");
const inside=(child,parent)=>{const rel=relative(parent,child);return rel===""||(!rel.startsWith("..")&&!isAbsolute(rel));};
if(inside(dir,root))throw Error("APP_CONFIG_DIR debe estar fuera del despliegue Git.");
if(existsSync(dir)&&inside(realpathSync(dir),root))throw Error("APP_CONFIG_DIR no puede apuntar al despliegue Git.");
if(Number(process.versions.node.split(".")[0])<22)throw Error("Se requiere Node.js 22 o superior.");
const defaults={NODE_ENV:"production",SITE_PREVIEW_MODE:"false",INSTALLER_AUTO_SETUP:"false"};
function read(){
 if(!existsSync(file))throw Error("Falta configuración privada: ejecuta npm run setup:enhance.");
 if((statSync(file).mode&0o077)!==0)throw Error("enhance.env debe tener permisos 0600.");
 const content=readFileSync(file,"utf8");
 const values={};
 for(const line of content.split(/\r?\n/)){
  if(!line.trim()||line.trim().startsWith("#"))continue;
  const match=/^([A-Z][A-Z0-9_]*)=(.*)$/.exec(line);
  if(!match)throw Error("Formato inválido de enhance.env.");
  if(!["NODE_ENV","SITE_PREVIEW_MODE","INSTALLER_AUTO_SETUP"].includes(match[1]))throw Error("Variable no admitida en enhance.env: "+match[1]);
  if(!["true","false","production"].includes(match[2]))throw Error("Valor inválido de "+match[1]);
  values[match[1]]=match[2];
 }
 return {...defaults,...values};
}
function save(values){
 mkdirSync(dir,{recursive:true,mode:0o700});
 chmodSync(dir,0o700);
 const temp=join(dir,".enhance-"+randomUUID());
 const content=Object.entries(values).map(([k,v])=>k+"="+v).join("\n")+"\n";
 writeFileSync(temp,content,{flag:"wx",mode:0o600});
 try{renameSync(temp,file);chmodSync(file,0o600);}
 finally{if(existsSync(temp))throw Error("No se pudo mover el archivo temporal.");}
}
if(command==="init"){
 if(existsSync(file)){read();console.log("Configuración privada existente; no se sobrescribió.");}
 else{save(defaults);console.log("Configuración privada creada con instalador deshabilitado.");}
 console.log("Ruta privada: "+file);
}else if(command==="enable"){
 if(process.env.NEXUS_INSTALLER_ACCESS_RESTRICTED!=="yes")throw Error("Primero restringe acceso HTTP al sitio; después ejecuta NEXUS_INSTALLER_ACCESS_RESTRICTED=yes npm run installer:enable.");
 if(existsSync(join(dir,"installation.json")))throw Error("El sitio ya está instalado.");
 save({...read(),INSTALLER_AUTO_SETUP:"true"});
 console.log("Instalador habilitado. Reinicia la aplicación y restringe acceso público.");
}else if(command==="disable"){
 save({...read(),INSTALLER_AUTO_SETUP:"false"});
 console.log("Instalador deshabilitado. Reinicia la aplicación.");
}else if(command==="start"){
 read();
 const child=spawn(process.execPath,["--env-file="+file,join(root,"node_modules","next","dist","bin","next"),"start","-H","0.0.0.0","-p",process.env.PORT||"3000"],{stdio:"inherit",env:process.env});
 for(const signal of ["SIGINT","SIGTERM"])process.on(signal,()=>child.kill(signal));
 child.on("error",error=>{console.error("No se pudo iniciar Next.js:",error.message);process.exitCode=1;});
 child.on("exit",(code,signal)=>{process.exitCode=code??(signal?1:0);});
}else{
 console.error("Uso: node scripts/enhance-private-env.mjs init|enable|disable|start");
 process.exitCode=2;
}
