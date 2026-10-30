/**
 * Rehearses the exact additive SQL migration on ephemeral GitHub Actions SQL.
 * SAFETY: deliberately removes new tables/column to simulate an older schema,
 * therefore runs ONLY in GitHub Actions against an explicit local *_ci DB.
 * NEVER execute in Plesk, production, staging with customer records, or locally.
 */
import assert from "node:assert/strict";
import {execFileSync} from "node:child_process";
import {resolve} from "node:path";
import {PrismaClient as MysqlPrismaClient} from "@prisma/client";

const raw=process.env.DATABASE_URL||"";
let url;
try{url=new URL(raw);}catch{throw new Error("CI database URL is missing");}
const postgres=["postgresql:","postgres:"].includes(url.protocol);
assert.equal(process.env.CI,"true","Only the GitHub Actions runner may run this rehearsal.");
assert.equal(process.env.NODE_ENV,"test","Migration rehearsal requires NODE_ENV=test.");
assert.equal(url.hostname,"127.0.0.1","Migration rehearsal refuses non-local SQL hosts.");
assert.match(url.pathname,/^\/[a-z0-9_]+_ci$/i,"Database must have the dedicated _ci suffix.");
assert.ok(["3306","5432"].includes(url.port),"Only CI MariaDB or PostgreSQL ports allowed.");
if(postgres)assert.equal(url.port,"5432");
else{assert.equal(url.protocol,"mysql:");assert.equal(url.port,"3306");}

const Client=postgres?(await import("../src/generated/postgres/index.js")).PrismaClient:MysqlPrismaClient;
const schema=postgres?"prisma/schema.postgres.prisma":"prisma/schema.prisma";
const file=postgres
 ?"prisma/migrations-postgres/20261030050000_nexus_functional_enhancements/migration.sql"
 :"prisma/migrations/20261030050000_nexus_functional_enhancements/migration.sql";
let client=new Client({datasources:{db:{url:raw}}});
let propertyId,leadId,refCode,tenantId;
try{
 const tenant=await client.tenant.findFirst({select:{id:true},orderBy:{createdAt:"asc"}});
 assert.ok(tenant,"A seeded CI tenant must exist");
 tenantId=tenant.id;
 const stamp=Date.now().toString(36);
 const p=await client.property.create({data:{
  tenantId,refCode:"OLD-CI-"+stamp.toUpperCase(),slug:"legacy-migration-"+stamp,
  title:"Inmueble anterior a la migración",city:"Managua",description:"Datos históricos que no deben cambiar.",
  type:"Casa",operation:"venta",price:"72000",published:false
 }});
 propertyId=p.id;refCode=p.refCode;
 const lead=await client.lead.create({data:{
  tenantId,propertyId,name:"Prospecto anterior a la migración",phone:"88887777",
  source:"telefono",consent:true
 }});
 leadId=lead.id;
 const before=await client.lead.findUniqueOrThrow({where:{id:leadId},include:{property:true}});
 assert.equal(before.property?.refCode,refCode);

 // The new, empty objects are removed in this *disposable CI database only*.
 // This recreates the precise pre-change structure used by an existing site.
 for(const table of ["LeadPropertyHistory","LeadSource","PropertySequence"]){
  const quoted=postgres?'"'+table+'"':"`"+table+"`";
  await client.$executeRawUnsafe("DROP TABLE IF EXISTS "+quoted);
 }
 await client.$executeRawUnsafe(postgres
  ?'ALTER TABLE "Lead" DROP COLUMN "externalPropertyInterest"'
  :"ALTER TABLE `Lead` DROP COLUMN `externalPropertyInterest`");
 await client.$disconnect();

 execFileSync("npx",["prisma","db","execute","--schema",schema,"--file",resolve(file)],{
  cwd:resolve("."),env:process.env,stdio:["ignore","pipe","pipe"],timeout:90000
 });
 client=new Client({datasources:{db:{url:raw}}});
 const restoredProperty=await client.property.findUniqueOrThrow({where:{id:propertyId}});
 const restoredLead=await client.lead.findUniqueOrThrow({where:{id:leadId}});
 assert.equal(restoredProperty.refCode,refCode,"Prior reference changed during migration");
 assert.equal(restoredProperty.title,"Inmueble anterior a la migración");
 assert.equal(restoredLead.propertyId,propertyId,"Historic prospect-property link was lost");
 assert.equal(restoredLead.source,"telefono","Historic lead channel changed");
 assert.equal(restoredLead.externalPropertyInterest,null,"New optional column must default to null");

 const seq=await client.propertySequence.create({data:{tenantId,prefix:"NRE",nextNumber:1}});
 assert.equal(seq.nextNumber,1);
 const source=await client.leadSource.create({data:{
  tenantId,code:"migration-ci",name:"Prueba de migración",active:true
 }});
 assert.equal(source.code,"migration-ci");
 const history=await client.leadPropertyHistory.create({data:{
  tenantId,leadId,fromPropertyId:null,toPropertyId:propertyId,toRef:refCode,
  fromExternalDescription:"Propiedad anunciada fuera del sistema",
  changedByName:"CI Migration Rehearsal"
 }});
 assert.equal(history.toPropertyId,propertyId);
 assert.equal(history.fromExternalDescription,"Propiedad anunciada fuera del sistema");
 // Remove only disposable CI fixture records. The actual migration never deletes records.
 await client.leadPropertyHistory.delete({where:{id:history.id}});
 await client.leadSource.delete({where:{id:source.id}});
 await client.propertySequence.delete({where:{tenantId}});
 await client.lead.delete({where:{id:leadId}});
 await client.property.delete({where:{id:propertyId}});
 console.log("PASS "+(postgres?"PostgreSQL":"MariaDB")+
  ": additive SQL migration preserved legacy property references, prospect association and source.");
}catch(error){
 console.error("FAIL additive migration rehearsal:",error instanceof Error?error.message:"unknown");
 process.exitCode=1;
}finally{
 await client.$disconnect();
}
