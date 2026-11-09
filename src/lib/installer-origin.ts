import "server-only";
import {NextRequest} from "next/server";

/**
 * Compare browser Origin against the canonical site URL when configured.
 * Do not trust forwarded headers or Sec-Fetch-Site alone as proof of origin.
 * On Enhance, Host can be rewritten to an internal upstream address.
 */
export function installerOriginAllowed(req:NextRequest):boolean{
 const origin=req.headers.get("origin");
 if(!origin)return false;
 let parsed:URL;
 try{parsed=new URL(origin);}catch{return false;}
 if(!["http:","https:"].includes(parsed.protocol)||parsed.username||parsed.password||parsed.pathname!=="/"||parsed.search||parsed.hash)return false;
 const configured=(process.env.SITE_URL||process.env.APP_URL||process.env.NEXT_PUBLIC_SITE_URL||"").trim();
 if(configured){
  try{
   const site=new URL(configured);
   if(site.username||site.password||site.pathname!=="/"||site.search||site.hash)return false;
   return parsed.origin===site.origin && (site.protocol==="https:"||process.env.NODE_ENV!=="production");
  }catch{return false;}
 }
 const host=req.headers.get("host")?.trim().toLowerCase();
 if(!host)return false;
 // Without a canonical URL, accept only exact Host match. Proxy headers are
 // not an authorization source unless the infrastructure explicitly trusts them.
 return parsed.host.toLowerCase()===host && (parsed.protocol==="https:"||process.env.NODE_ENV!=="production");
}
