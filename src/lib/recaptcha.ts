/** Server-side verification of Google reCAPTCHA v2 checkbox.
 * Enabled only when RECAPTCHA_REQUIRED=true; production never trusts a client-only tick.
 */
import {normalizeSiteHost} from "@/lib/preview";

export function recaptchaRequired(){return process.env.RECAPTCHA_REQUIRED==="true";}
export function recaptchaSiteKey(){
 return recaptchaRequired()?(process.env.RECAPTCHA_SITE_KEY||"").trim():"";
}
export async function verifyLoginCaptcha(token:string,host:string):Promise<boolean>{
 if(!recaptchaRequired())return true;
 const secret=(process.env.RECAPTCHA_SECRET_KEY||"").trim();
 const siteKey=recaptchaSiteKey();
 if(!secret||!siteKey||!token||token.length>4000)return false;
 try{
  const params=new URLSearchParams({secret,response:token});
  const res=await fetch("https://www.google.com/recaptcha/api/siteverify",{
   method:"POST",body:params,cache:"no-store",
   signal:AbortSignal.timeout(5000)
  });
  if(!res.ok)return false;
  const result=await res.json() as {success?:boolean;hostname?:string;"error-codes"?:string[]};
  return result.success===true&&!!result.hostname&&
   normalizeSiteHost(result.hostname)===normalizeSiteHost(host)&&
   !(result["error-codes"]||[]).length;
 }catch{return false;}
}
