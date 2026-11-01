import "server-only";
import {createHmac,timingSafeEqual} from "node:crypto";
import {installerToken} from "@/lib/server-config";
export const STEP_COOKIE="nexus_setup_math";
const sign=(value:string)=>createHmac("sha256",installerToken()).update(value).digest("hex");
export function createStepProof(){const until=String(Date.now()+5*60_000);return until+"."+sign(until);}
export function validStepProof(value:string|undefined){
 if(!value)return false;
 const [until,signature,...rest]=value.split(".");
 if(rest.length || !/^\d{13}$/.test(until) || !/^[a-f0-9]{64}$/.test(signature) || Number(until)<Date.now())return false;
 return timingSafeEqual(Buffer.from(signature,"hex"),Buffer.from(sign(until),"hex"));
}
