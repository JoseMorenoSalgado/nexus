/** reCAPTCHA v2 checkbox; verification always happens on the server. */
import {normalizeSiteHost} from "@/lib/preview";
import {environmentIntegrations,integrationsForTenant,type CaptchaConfig} from "@/lib/integration-config";

// Preserve environment-only deployments and existing test helpers.
export function recaptchaRequired(){return process.env.RECAPTCHA_REQUIRED==="true";}
export function recaptchaSiteKey(){
 return recaptchaRequired()?(process.env.RECAPTCHA_SITE_KEY||"").trim():"";
}
export async function captchaForHost(host:string):Promise<CaptchaConfig>{
 // Emergency recovery switch available to the server operator via Plesk.
 if(process.env.NEXUS_DISABLE_CAPTCHA==="true")return {enabled:false,siteKey:"",secretKey:""};
 const fallback=environmentIntegrations().captcha;
 if(!process.env.APP_CONFIG_DIR||!process.env.APP_CONFIG_DIR.startsWith("/"))return fallback;
 const [{hasDatabaseConfig},{prisma}]=await Promise.all([import("@/lib/server-config"),import("@/lib/prisma")]);
 if(!hasDatabaseConfig())return fallback;
 const domain=await prisma.domain.findUnique({where:{hostname:normalizeSiteHost(host)},select:{tenantId:true}});
 if(!domain)return fallback;
 return integrationsForTenant(domain.tenantId).captcha;
}
export async function verifyLoginCaptcha(token:string,host:string):Promise<boolean>{
 const config=await captchaForHost(host);
 if(!config.enabled)return true;
 const secret=config.secretKey.trim(),siteKey=config.siteKey.trim();
 if(!secret||!siteKey||!token||token.length>4000)return false;
 try{
  const params=new URLSearchParams({secret,response:token});
  const res=await fetch("https://www.google.com/recaptcha/api/siteverify",{
   method:"POST",body:params,cache:"no-store",signal:AbortSignal.timeout(5000)
  });
  if(!res.ok)return false;
  const result=await res.json() as {success?:boolean;hostname?:string;"error-codes"?:string[]};
  return result.success===true&&!!result.hostname&&
   normalizeSiteHost(result.hostname)===normalizeSiteHost(host)&&
   !(result["error-codes"]||[]).length;
 }catch{return false;}
}
