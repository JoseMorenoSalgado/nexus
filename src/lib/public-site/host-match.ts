/** Pure host matching for the standalone public website. */
export function isAllowedPublicHost(requested: string, siteUrl: string, registered: readonly string[]): boolean {
 const normalize=(host:string)=>host.trim().toLowerCase().replace(/\.$/,"").replace(/^www\./,"");
 const hostname=normalize(requested);
 if(!hostname || !/^[a-z0-9.-]+$/.test(hostname))return false;
 if(siteUrl.trim()){
  try{
   const url=new URL(siteUrl.trim());
   if(url.protocol!=="https:"||url.username||url.password||url.pathname!=="/"||url.search||url.hash||url.port)return false;
   return hostname===normalize(url.hostname);
  }catch{return false;}
 }
 return registered.some(host=>normalize(host)===hostname);
}
