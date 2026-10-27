import {hasDatabaseConfig} from "@/lib/server-config";
import {NextResponse} from "next/server";
import {prisma} from "@/lib/prisma";
export const dynamic="force-dynamic";
export async function GET(){
 if(!hasDatabaseConfig())return NextResponse.json({status:"unavailable"},{status:503});
 try{
  await prisma.$queryRaw`SELECT 1`;
  return NextResponse.json({status:"ok"},{headers:{"Cache-Control":"no-store"}});
 }catch{return NextResponse.json({status:"unavailable"},{status:503});}
}
