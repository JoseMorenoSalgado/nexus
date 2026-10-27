import {NextRequest,NextResponse} from "next/server";
import {hasDatabaseConfig} from "@/lib/server-config";
import {prisma} from "@/lib/prisma";
import {normalizeSiteHost} from "@/lib/preview";

/**
 * Read-only, non-secret diagnostic for the domain-bound NEXUS installation.
 * No credentials, SQL hostnames, users, connection URLs, stack traces or tenant IDs
 * are ever returned. This intentionally does not install, migrate or seed data.
 */
export const dynamic="force-dynamic";
export const runtime="nodejs";

type DiagnosticStatus =
 "ready"|"configuration_missing"|"configuration_unreadable"|
 "database_unreachable"|"database_schema_incomplete"|"domain_not_registered";

function reply(status:DiagnosticStatus,httpStatus:number){
 return NextResponse.json(
  {service:"nexus",status,checks:{
   configuration:status==="configuration_missing"?"missing":status==="configuration_unreadable"?"unreadable":"present",
   database:status==="configuration_missing"||status==="configuration_unreadable"?"not_checked":
    status==="database_unreachable"?"unavailable":status==="database_schema_incomplete"?"schema_incomplete":"connected",
   domain:status==="ready"?"registered":status==="domain_not_registered"?"not_registered":"not_checked"
  }},
  {status:httpStatus,headers:{"Cache-Control":"private, no-store, max-age=0","X-Robots-Tag":"noindex, nofollow"}}
 );
}

function errorCode(error:unknown):string{
 if(!error||typeof error!=="object"||!("code" in error))return "unknown";
 const value=Reflect.get(error,"code");
 return typeof value==="string"&&/^P\d{4}$/.test(value)?value:"unknown";
}

export async function GET(req:NextRequest){
 let configured=false;
 try{configured=hasDatabaseConfig();}
 catch(error){
  // Log only an error category, never the raw message (which could contain SQL secrets).
  console.error("[nexus-diagnostic] installation config unreadable",error instanceof Error?error.name:"unknown");
  return reply("configuration_unreadable",503);
 }
 if(!configured)return reply("configuration_missing",503);

 try{await prisma.$queryRaw`SELECT 1`;}
 catch(error){
  const code=errorCode(error);
  console.error("[nexus-diagnostic] database probe failed",code);
  return reply(code==="P2021"||code==="P2022"?"database_schema_incomplete":"database_unreachable",503);
 }

 // Only inspect the configured hostname in our own database. Never auto-link
 // or fall back to the first tenant: that would violate cross-client isolation.
 const hostname=normalizeSiteHost(req.headers.get("host")||"");
 if(!hostname||hostname.length>253)return reply("domain_not_registered",503);
 try{
  const mapping=await prisma.domain.findUnique({
   where:{hostname},
   select:{tenant:{select:{active:true}}}
  });
  if(!mapping?.tenant.active)return reply("domain_not_registered",503);
  return reply("ready",200);
 }catch(error){
  const code=errorCode(error);
  console.error("[nexus-diagnostic] domain mapping probe failed",code);
  return reply(code==="P2021"||code==="P2022"?"database_schema_incomplete":"database_unreachable",503);
 }
}
