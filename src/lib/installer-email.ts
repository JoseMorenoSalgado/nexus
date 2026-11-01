import "server-only";
import {createHmac, randomInt, timingSafeEqual} from "node:crypto";
import {readFileSync, writeFileSync, renameSync, mkdirSync, existsSync, unlinkSync} from "node:fs";
import {join} from "node:path";
import {createTransport} from "nodemailer";
import {configDir, installerAvailable, installerToken} from "@/lib/server-config";

const path=()=>join(configDir(),"installer-email-otp.json");
type Challenge={hash:string;expires:number;attempts:number;lastSent:number};
const email=()=> (process.env.INSTALLER_OWNER_EMAIL || "").trim().toLowerCase();
const hash=(code:string)=>createHmac("sha256",installerToken()).update(code).digest("hex");
const read=():Challenge|null=>{try{return JSON.parse(readFileSync(path(),"utf8")) as Challenge;}catch{return null;}};
function store(data:Challenge){mkdirSync(configDir(),{recursive:true,mode:0o700});const tmp=path()+".tmp";writeFileSync(tmp,JSON.stringify(data),{mode:0o600});renameSync(tmp,path());}
export function emailSetupEnabled(){return installerAvailable() && Boolean(email() && process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS && process.env.SMTP_FROM);}
export async function sendInstallerCode(candidate:string){
 if(!emailSetupEnabled())return "disabled";
 if(candidate.trim().toLowerCase()!==email())return "ok";
 const previous=read(),now=Date.now();
 if(previous && now-previous.lastSent<60_000)return "wait";
 const code=String(randomInt(0,1_000_000)).padStart(6,"0");
 const port=Number(process.env.SMTP_PORT || 587);
 const transport=createTransport({host:process.env.SMTP_HOST,port,secure:port===465,auth:{user:process.env.SMTP_USER,pass:process.env.SMTP_PASS}});
 await transport.sendMail({from:process.env.SMTP_FROM,to:email(),subject:"Nexus: código de instalación",text:`Tu código de instalación es ${code}. Caduca en 10 minutos. Si no lo solicitaste, ignora este correo.`});
 store({hash:hash(code),expires:now+600_000,attempts:0,lastSent:now});
 return "ok";
}
export function verifyInstallerCode(code:string){
 if(!emailSetupEnabled() || !/^\\d{6}$/.test(code))return false;
 const challenge=read();if(!challenge || challenge.expires<Date.now() || challenge.attempts>=5)return false;
 challenge.attempts++;store(challenge);
 const valid=timingSafeEqual(Buffer.from(hash(code),"hex"),Buffer.from(challenge.hash,"hex"));
 if(valid && existsSync(path()))unlinkSync(path());
 return valid;
}
