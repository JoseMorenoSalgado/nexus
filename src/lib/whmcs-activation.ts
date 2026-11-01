import "server-only";
import {randomUUID} from "node:crypto";

export function whmcsActivationEnabled(){
 return Boolean(process.env.WHMCS_ACTIVATION_URL?.trim() && process.env.WHMCS_ACTIVATION_SECRET?.trim());
}

/**
 * Private server-to-server activation contract v1.
 * The WHMCS module must atomically validate AND consume the code.
 * This is intentionally fail-closed: no session is granted on network errors.
 */
export async function consumeWhmcsActivation(code:string, domain:string):Promise<boolean>{
 const endpoint=process.env.WHMCS_ACTIVATION_URL?.trim();
 const secret=process.env.WHMCS_ACTIVATION_SECRET?.trim();
 const cms="nexus";
 if(!endpoint || !secret || !/^[A-Za-z0-9_-]{16,128}$/.test(code) || !/^[a-z0-9.-]{4,253}$/.test(domain))return false;
 let url:URL;
 try{url=new URL(endpoint);if(url.protocol!=="https:" || url.username || url.password || url.search || url.hash)return false;}
 catch{return false;}
 const controller=new AbortController();
 const timeout=setTimeout(()=>controller.abort(),8000);
 try{
  const response=await fetch(url,{method:"POST",headers:{"Content-Type":"application/json","Authorization":`Bearer ${secret}`,"Accept":"application/json"},body:JSON.stringify({version:1,action:"consume",code,cms,domain,requestId:randomUUID()}),signal:controller.signal,cache:"no-store",redirect:"error"});
  if(!response.ok)return false;
  const data:unknown=await response.json();
  if(!data || typeof data!=="object")return false;
  const result=data as Record<string,unknown>;
  return result.valid===true && result.consumed===true && result.cms===cms && result.domain===domain && typeof result.serviceId==="string" && result.serviceId.length>0;
 }catch{return false;}finally{clearTimeout(timeout);}
}
