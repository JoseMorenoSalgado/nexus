/** Read-only verification of a genuinely tenant-free fresh PostgreSQL schema. */
import {PrismaClient} from "../src/generated/standalone-postgres";
async function main(){
 if(process.env.NEXUS_STANDALONE!=="true")throw Error("NEXUS_STANDALONE must be true");
 const db=new PrismaClient();
 try{
  await db.$queryRawUnsafe("SELECT 1");
  const [users,properties,leads,pages,config]=await Promise.all([
   db.adminUser.count(),db.property.count(),db.lead.count(),db.sitePage.count(),
   db.siteConfig.findUnique({where:{id:"main"}})
  ]);
  const legacy=await db.$queryRawUnsafe<Array<{table_name:string}>>(
   "SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND lower(table_name) IN ('tenant','domain')"
  );
  if(legacy.length)throw Error("Legacy Tenant/Domain tables detected in fresh standalone database");
  console.log(JSON.stringify({standalone:true,postgresql:"ok",tenantTables:0,users,properties,leads,pages,siteConfigPresent:!!config}));
 }finally{await db.$disconnect();}
}
main().catch(e=>{console.error("[fresh-standalone-db]",e instanceof Error?e.message:"Unexpected error");process.exitCode=1;});
