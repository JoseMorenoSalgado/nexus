/**
 * Recover the public site host when Enhance terminates HTTPS at its reverse proxy.
 * Never trust a forwarded host unless the direct Host is a local/private upstream
 * and the proxy advertises HTTPS, or an explicit canonical SITE_URL pins it.
 * This module is pure so security edge cases can be tested without a database.
 */
type RequestHeaders = Pick<Headers,"get">;
type PublicEnv = {[key:string]:string|undefined};

function parseHost(raw:string|null,protocol:"http:"|"https:"="https:"):URL|null{
 if(!raw||raw.length>260||/[\\/\s@?#,]/.test(raw))return null;
 try{
  const value=new URL(protocol+"//"+raw);
  return value.username||value.password||value.pathname!=="/"||value.search||value.hash?null:value;
 }catch{return null;}
}
function privateHost(hostname:string):boolean {
 const h=hostname.toLowerCase();
 if(["localhost","127.0.0.1","0.0.0.0","[::1]","::1"].includes(h))return true;
 const parts=h.split(".").map(Number);
 if(parts.length===4&&parts.every(x=>Number.isInteger(x)&&x>=0&&x<=255)){
  return parts[0]===10||parts[0]===127||(parts[0]===192&&parts[1]===168)||
   (parts[0]===172&&parts[1]>=16&&parts[1]<=31);
 }
 return false;
}
function configuredOrigin(env:PublicEnv):URL|null {
 const raw=(env.SITE_URL||env.APP_URL||env.NEXT_PUBLIC_SITE_URL||"").trim();
 if(!raw)return null;
 try{
  const url=new URL(raw);
  if(url.protocol!=="https:"||url.username||url.password||url.pathname!=="/"||url.search||url.hash)return null;
  return url;
 }catch{return null;}
}
function configuredInvalid(env:PublicEnv):boolean{
 return Boolean((env.SITE_URL||env.APP_URL||env.NEXT_PUBLIC_SITE_URL||"").trim()&&!configuredOrigin(env));
}
function trustedSiteHost(headers:RequestHeaders,env:PublicEnv):string|null{
 const canonical=configuredOrigin(env);
 if(configuredInvalid(env))return null;
 const direct=parseHost(headers.get("host"));
 if(!direct)return null;
 const upstream=privateHost(direct.hostname);
 const forwardedRaw=headers.get("x-forwarded-host");
 const forwarded=parseHost(forwardedRaw);
 const forwardedProto=(headers.get("x-forwarded-proto")||"").split(",")[0].trim().toLowerCase();
 if(canonical){
  if(direct.host.toLowerCase()===canonical.host.toLowerCase())return canonical.host;
  if(!upstream)return null;
  // When the proxy sends X-Forwarded-Host it must agree with SITE_URL.
  if(forwardedRaw&&(!forwarded||forwarded.host.toLowerCase()!==canonical.host.toLowerCase()))return null;
  // SITE_URL is an explicit server-side allowlist for upstreams that omit Host forwarding.
  return canonical.host;
 }
 if(!upstream)return direct.host;
 if(forwarded&&forwardedProto==="https"&&!privateHost(forwarded.hostname))return forwarded.host;
 // CI and local direct access must continue working, but cannot impersonate HTTPS.
 if(["localhost","127.0.0.1","::1","[::1]"].includes(direct.hostname))return direct.host;
 return null;
}
export function publicRequestHostname(headers:RequestHeaders,env:PublicEnv=process.env):string|null{
 const host=trustedSiteHost(headers,env);
 return host?parseHost(host)?.hostname.toLowerCase()||null:null;
}
export function validPublicMutationOrigin(headers:RequestHeaders,env:PublicEnv=process.env):boolean{
 const raw=headers.get("origin");
 if(!raw)return false;
 let origin:URL;
 try{
  origin=new URL(raw);
  if(origin.origin!==raw||origin.username||origin.password||origin.pathname!=="/"||origin.search||origin.hash)return false;
 }catch{return false;}
 const canonical=configuredOrigin(env);
 if(configuredInvalid(env))return false;
 // For an explicitly configured canonical HTTPS origin, validate the browser
 // Origin directly. Enhance may use an internal Host when proxying to Node.
 // Do not trust forwarded headers to decide whether a cross-site Origin is valid.
 if(canonical)return origin.origin===canonical.origin;
 const host=trustedSiteHost(headers,env);
 if(!host)return false;
 if(origin.host.toLowerCase()!==host.toLowerCase())return false;
 return origin.protocol==="https:"||(origin.protocol==="http:"&&privateHost(origin.hostname));
}
