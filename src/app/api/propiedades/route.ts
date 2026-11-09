import {isStandaloneMode} from "@/lib/installation-mode";
import {NextResponse} from "next/server";
import {getStandalonePublicContext} from "@/lib/independent-public-context";
import {isAllowedPublicHost} from "@/lib/public-site/host-match";
import {publicPageHostname} from "@/lib/public-request-origin";

/** Read-only public catalogue integration for NEW standalone deployments only. */
export const dynamic="force-dynamic";
export async function GET(request:Request){
 if(!isStandaloneMode())return new Response(null,{status:404});
 const siteUrl=(process.env.SITE_URL||"").trim();
 if(!siteUrl)return NextResponse.json({error:"SITE_URL is required"},{status:503});
 const host=publicPageHostname(request.headers);
 if(!host||!isAllowedPublicHost(host,siteUrl,[]))return new Response(null,{status:404});
 try{
  const ctx=await getStandalonePublicContext();
  if(!ctx)return NextResponse.json({error:"Site not initialized"},{status:503});
  return NextResponse.json({site:{name:ctx.tenant.name,tagline:ctx.tenant.tagline},properties:ctx.properties});
 }catch(error){
  console.error("Standalone public integration failure",error instanceof Error?error.name:"unknown");
  return NextResponse.json({error:"Standalone database unavailable"},{status:503});
 }
}
