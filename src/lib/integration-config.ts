import {createCipheriv,createDecipheriv,createHash,randomBytes} from "node:crypto";
import {chmodSync,existsSync,mkdirSync,openSync,closeSync,readFileSync,writeFileSync,renameSync,unlinkSync} from "node:fs";
import {join,resolve,relative,isAbsolute,basename} from "node:path";
// The existing installation uses APP_CONFIG_DIR; avoid importing the database client here.

export type SmtpConfig={enabled:boolean;host:string;port:465|587;user:string;password:string;from:string;to:string};
export type CaptchaConfig={enabled:boolean;siteKey:string;secretKey:string};
export type IntegrationConfig={smtp:SmtpConfig;captcha:CaptchaConfig};
type Envelope={version:1;nonce:string;tag:string;ciphertext:string};
const EMAIL=/^[^\s@,<>]+@[^\s@,<>]+\.[^\s@,<>]+$/;
const HOST=/^(?=.{1,253}$)[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$/i;

export function smtpValid(c:SmtpConfig){
 return !!(c.enabled&&HOST.test(c.host)&&[465,587].includes(c.port)&&c.user.trim()&&c.password&&EMAIL.test(c.from)&&EMAIL.test(c.to));
}
export function captchaValid(c:CaptchaConfig){
 return !!(c.enabled&&c.siteKey.trim()&&c.secretKey.trim());
}
export function environmentIntegrations():IntegrationConfig{
 const v=process.env;
 return {
  smtp:{enabled:v.SMTP_ENABLED==="true",host:v.SMTP_HOST||"",port:v.SMTP_PORT==="465"?465:587,
   user:v.SMTP_USER||"",password:v.SMTP_PASSWORD||"",from:v.SMTP_FROM||"",to:v.SMTP_NOTIFY_TO||""},
  captcha:{enabled:v.RECAPTCHA_REQUIRED==="true",siteKey:v.RECAPTCHA_SITE_KEY||"",secretKey:v.RECAPTCHA_SECRET_KEY||""}
 };
}
const inside=(child:string,parent:string)=>{
 const r=relative(parent,child);
 return r===""||(!r.startsWith("..")&&!isAbsolute(r));
};
function protectedDir(){
 const configured=process.env.APP_CONFIG_DIR||"";
 if(!isAbsolute(configured))throw new Error("APP_CONFIG_DIR debe ser una ruta privada absoluta.");
 const root=resolve(configured),publicRoot=resolve(process.cwd(),"public");
 const docs=process.env.PLESK_DOCUMENT_ROOT||process.env.DOCUMENT_ROOT||
  (basename(process.cwd())==="httpdocs"?process.cwd():publicRoot);
 if(inside(root,resolve(docs))||inside(root,publicRoot))
  throw new Error("APP_CONFIG_DIR no puede estar dentro del directorio público.");
 return root;
}
function tenantPath(tenantId:string){
 const digest=createHash("sha256").update(tenantId).digest("hex");
 return join(protectedDir(),"integrations",digest+".json");
}
function keyPath(){return join(protectedDir(),".integrations-key");}
function masterKey(create:boolean){
 const path=keyPath();
 if(!existsSync(path)){
  if(!create)throw new Error("Falta la clave privada de integraciones.");
  mkdirSync(protectedDir(),{recursive:true,mode:0o700});
  try{
   const fd=openSync(path,"wx",0o600);
   try{writeFileSync(fd,randomBytes(32).toString("hex"),{encoding:"utf8"});}
   finally{closeSync(fd);}
  }catch(e){
   if(!(e instanceof Error&&"code" in e&&e.code==="EEXIST"))throw e;
  }
 }
 const key=Buffer.from(readFileSync(path,"utf8").trim(),"hex");
 if(key.length!==32)throw new Error("Clave privada de integraciones inválida.");
 return key;
}
export function storedIntegrations(tenantId:string):IntegrationConfig|null{
 // Existing installations still using env variables need no private settings file.
 if(!isAbsolute(process.env.APP_CONFIG_DIR||""))return null;
 const path=tenantPath(tenantId);
 if(!existsSync(path))return null;
 const obj=JSON.parse(readFileSync(path,"utf8")) as Envelope;
 if(obj.version!==1)throw new Error("Formato de integraciones no compatible.");
 const decrypt=createDecipheriv("aes-256-gcm",masterKey(false),Buffer.from(obj.nonce,"base64"));
 decrypt.setAuthTag(Buffer.from(obj.tag,"base64"));
 const decoded=Buffer.concat([decrypt.update(Buffer.from(obj.ciphertext,"base64")),decrypt.final()]);
 const config=JSON.parse(decoded.toString("utf8")) as IntegrationConfig;
 if(!config.smtp||!config.captcha)throw new Error("Integraciones incompletas.");
 return config;
}
export function integrationsForTenant(tenantId:string):IntegrationConfig{
 return storedIntegrations(tenantId)||environmentIntegrations();
}
/** Save only into the APP_CONFIG_DIR private volume. The API never sends passwords back to browsers. */
export function saveIntegrations(tenantId:string,config:IntegrationConfig){
 const path=tenantPath(tenantId),dir=join(protectedDir(),"integrations");
 mkdirSync(dir,{recursive:true,mode:0o700});
 const key=masterKey(true),nonce=randomBytes(12);
 const encrypt=createCipheriv("aes-256-gcm",key,nonce);
 const ciphertext=Buffer.concat([encrypt.update(JSON.stringify(config),"utf8"),encrypt.final()]);
 const envelope:Envelope={version:1,nonce:nonce.toString("base64"),
  tag:encrypt.getAuthTag().toString("base64"),ciphertext:ciphertext.toString("base64")};
 const temp=join(dir,".tmp-"+randomBytes(16).toString("hex"));
 try{
  writeFileSync(temp,JSON.stringify(envelope),{flag:"wx",mode:0o600});
  chmodSync(temp,0o600);
  renameSync(temp,path);
 }finally{if(existsSync(temp))unlinkSync(temp);}
}
