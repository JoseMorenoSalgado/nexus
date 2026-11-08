/** Assert HTTP-created records really persisted in the fresh standalone database. */
import {PrismaClient} from "../src/generated/standalone-postgres";
async function main(){
 if(process.env.NEXUS_STANDALONE!=="true"||process.env.NODE_ENV!=="test")throw Error("CI standalone test environment required");
 const db=new PrismaClient();
 try{
  const [user,property,lead]=await Promise.all([
   db.adminUser.findUnique({where:{email:"ci-http-agent@example.invalid"},select:{id:true,role:true,active:true}}),
   db.property.findFirst({where:{title:"CI HTTP Created House"},select:{id:true,refCode:true,slug:true,published:true}}),
   db.lead.findFirst({where:{name:"CI HTTP prospect"},select:{id:true,phone:true,consent:true}})
  ]);
  if(!user||!user.active||!JSON.parse(user.role).includes("agente"))throw Error("Authenticated user creation did not persist an active agent");
  if(!property||!/^NRE-\\d{6}$/.test(property.refCode)||!property.slug.includes(property.refCode.toLowerCase()))throw Error("Authenticated property creation did not persist a valid reference and slug");
  if(property.published)throw Error("Newly created property unexpectedly published");
  if(!lead||lead.phone!=="88888888"||!lead.consent)throw Error("Authenticated prospect creation did not persist");
  console.log("Authenticated standalone HTTP mutations persisted:",JSON.stringify({user:user.id,property:property.id,reference:property.refCode,lead:lead.id}));
 }finally{await db.$disconnect();}
}
main().catch(e=>{console.error("[standalone-http-persistence]",e instanceof Error?e.message:"Unexpected error");process.exitCode=1;});
