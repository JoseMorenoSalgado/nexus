import "server-only";
import {readFileSync,existsSync,mkdirSync,openSync,closeSync,unlinkSync,writeFileSync,renameSync,chmodSync} from "node:fs";
import {join,resolve} from "node:path";
import {homedir} from "node:os";
import {randomUUID,randomBytes} from "node:crypto";

export type StoredInstallation={version:1;databaseUrl:string;installedAt:string};
/** Persistent per-account state: GitHub deploys/current is replaced on every release. */
export function configDir(){
 const explicit=process.env.APP_CONFIG_DIR?.trim();
 return resolve(explicit || join(homedir(), "nexus-runtime"));
}
export function configPath(){return join(configDir(),"installation.json");}
export function storedInstallation():StoredInstallation|null{
 const path=configPath();
 if(!existsSync(path))return null;
 const data=JSON.parse(readFileSync(path,"utf8")) as StoredInstallation;
 if(data.version!==1||!data.databaseUrl)throw new Error("Archivo de instalación inválido");
 return data;
}
export function databaseUrl():string|undefined{
 return storedInstallation()?.databaseUrl||process.env.DATABASE_URL?.trim()||undefined;
}
export function hasDatabaseConfig(){return Boolean(databaseUrl());}
/**
 * The initial installer needs a secret even when Dockploy does not forward
 * application environment variables. Generate it once, on a writable private
 * persistent volume. Never expose it through HTTP responses or logs.
 */
export function installerToken(){
 const configured=(process.env.INSTALLER_TOKEN||"").trim();
 if(configured.length>=24)return configured;
 if(hasDatabaseConfig())return "";
 mkdirSync(configDir(),{recursive:true,mode:0o700});
 const path=join(configDir(),"installer-token");
 try{
  const fd=openSync(path,"wx",0o600);
  try{writeFileSync(fd,randomBytes(32).toString("hex"),{encoding:"utf8"});}
  finally{closeSync(fd);}
 }catch(error){
  if(!(error instanceof Error && "code" in error && error.code==="EEXIST"))throw error;
 }
 const token=readFileSync(path,"utf8").trim();
 if(!/^[a-f0-9]{64}$/.test(token))throw new Error("Token privado del instalador inválido");
 return token;
}
export function installerAvailable(){return !hasDatabaseConfig();}
export function saveInstallation(database:string){
 mkdirSync(configDir(),{recursive:true,mode:0o700});
 const path=configPath();
 if(existsSync(path))throw new Error("La plataforma ya está instalada");
 const temp=join(configDir(),".setup-"+randomUUID());
 try{
  writeFileSync(temp,JSON.stringify({version:1,databaseUrl:database,installedAt:new Date().toISOString()}),{flag:"wx",mode:0o600});
  chmodSync(temp,0o600);
  renameSync(temp,path);
  // No leave the one-use generated setup token after successful installation.
  const setupTokenPath=join(configDir(),"installer-token");
  if(existsSync(setupTokenPath))unlinkSync(setupTokenPath);
 }finally{if(existsSync(temp))unlinkSync(temp);}
}
export function takeInstallLock(){
 mkdirSync(configDir(),{recursive:true,mode:0o700});
 const path=join(configDir(),".installer.lock");
 const fd=openSync(path,"wx",0o600);
 return ()=>{closeSync(fd);unlinkSync(path);};
}
