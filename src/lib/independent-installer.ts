import "server-only";
import {getStandalonePrisma} from "@/lib/prisma-standalone";
import {PrismaClient} from "@/generated/standalone-postgres";
import {hashPassword} from "@/lib/auth";

/**
 * Called only after a FRESH PostgreSQL database has been initialized with
 * prisma/schema.standalone.postgres.prisma.
 * Refuses to overwrite any existing site or administrator.
 */
export async function initializeStandaloneSite(input:{
 name:string;adminName:string;adminEmail:string;adminPassword:string;
 contactEmail?:string;whatsapp?:string;
},databaseUrlOverride?:string){
 const name=input.name.trim(),adminName=input.adminName.trim();
 const email=input.adminEmail.trim().toLowerCase();
 if(!name||!adminName||!/^\S+@\S+\.\S+$/.test(email)||input.adminPassword.length<12){
  throw new Error("Invalid standalone installation details");
 }
 const db=databaseUrlOverride?new PrismaClient({datasources:{db:{url:databaseUrlOverride}}}):getStandalonePrisma();
 try{return await db.$transaction(async tx=>{
  const [existingSite,adminCount]=await Promise.all([
   tx.siteConfig.count(),tx.adminUser.count()
  ]);
  if(existingSite||adminCount)throw new Error("Installation already initialized");
  const site=await tx.siteConfig.create({data:{
   id:"main",name,contactEmail:input.contactEmail?.trim()||null,
   whatsapp:input.whatsapp?.trim()||null
  }});
  const admin=await tx.adminUser.create({data:{
   name:adminName,email,passwordHash:hashPassword(input.adminPassword),
   role:"admin",active:true
  }});
  await tx.propertySequence.create({data:{id:"main"}});
  return {siteId:site.id,adminId:admin.id};
 });}finally{if(databaseUrlOverride)await db.$disconnect();}
}
