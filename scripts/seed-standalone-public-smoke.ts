/** CI-only fixtures for real public HTTP checks on a fresh standalone database. */
import {PrismaClient} from "../src/generated/standalone-postgres";
const db=new PrismaClient();
async function main(){
 if(process.env.NEXUS_STANDALONE!=="true"||process.env.NODE_ENV!=="test")throw Error("CI standalone test environment required");
 await db.siteConfig.upsert({where:{id:"main"},create:{id:"main",name:"Nexus CI",tagline:"Independent site smoke test"},update:{name:"Nexus CI"}});
 await db.property.upsert({where:{slug:"ci-public-property"},create:{slug:"ci-public-property",refCode:"CI-PUBLIC-001",title:"CI published property",description:"Standalone public page test fixture",city:"Managua",type:"Casa",operation:"venta",price:"123456.00",published:true},update:{published:true}});
 await db.property.upsert({where:{slug:"ci-draft-property"},create:{slug:"ci-draft-property",refCode:"CI-DRAFT-001",title:"CI draft property",description:"Unpublished fixture must never be public",city:"Managua",type:"Casa",operation:"venta",price:"100.00",published:false},update:{published:false}});
 console.log("Standalone public smoke fixtures ready");
}
main().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>db.$disconnect());
