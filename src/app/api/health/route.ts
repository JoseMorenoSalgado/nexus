import {hasDatabaseConfig} from "@/lib/server-config";
import {NextResponse} from "next/server";
import {prisma} from "@/lib/prisma";

export const dynamic="force-dynamic";
export const runtime="nodejs";
/** Health includes the core schema; SELECT 1 alone misses missing Domain tables (Prisma P2021). */
export async function GET(){
 try{
  if(!hasDatabaseConfig())return NextResponse.json({status:"unavailable",reason:"configuration_missing"},{status:503,headers:{"Cache-Control":"no-store"}});
  await prisma.$queryRaw`SELECT 1`;
  await prisma.domain.count();
  return NextResponse.json({status:"ok"},{headers:{"Cache-Control":"no-store"}});
 }catch(error){
  const code=error&&typeof error==="object"&&"code" in error?String(error.code):"";
  const schema=code==="P2021"||code==="P2022";
  // Do not return raw Prisma messages or SQL configuration data to the visitor.
  return NextResponse.json({status:"unavailable",reason:schema?"schema_incomplete":"database_unavailable"},
   {status:503,headers:{"Cache-Control":"no-store"}});
 }
}
