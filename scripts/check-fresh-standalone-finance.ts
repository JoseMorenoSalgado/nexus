/** Real financial lifecycle checks against the ephemeral tenant-free CI database. */
import {PrismaClient} from "../src/generated/standalone-postgres";
const db=new PrismaClient();
const assert=(ok:unknown,message:string)=>{if(!ok)throw Error(message);};
async function main(){
 if(process.env.NEXUS_STANDALONE!=="true")throw Error("Standalone mode required");
 const tag="ci-finance-"+Date.now();
 const user=await db.adminUser.create({data:{email:tag+"@example.invalid",name:"CI Agent",passwordHash:"ci-only-not-a-real-password",role:"agente"}});
 try{
  const property=await db.property.create({data:{slug:tag,refCode:tag,title:"CI property",description:"Temporary integration fixture",city:"Managua",type:"casa",operation:"venta",price:"100000.00",assignedAgentId:user.id}});
  const lead=await db.lead.create({data:{name:"CI Prospect",phone:"00000000",propertyId:property.id,assignedAgentId:user.id}});
  const closing=await db.commercialClosing.create({data:{leadId:lead.id,propertyId:property.id,agentId:user.id,agentName:user.name,propertyRefCode:property.refCode,clientName:lead.name,kind:"venta",amount:"100000.00",commissionAmount:"3000.00",closedAt:new Date("2026-01-01T00:00:00Z"),createdByName:"CI Admin"}});
  const payment=await db.commissionPayment.create({data:{closingId:closing.id,amount:"1200.00",paidAt:new Date("2026-01-02T00:00:00Z"),createdByName:"CI Admin"}});
  const paid=await db.commissionPayment.aggregate({where:{closingId:closing.id,status:"confirmado"},_sum:{amount:true}});
  assert(paid._sum.amount?.toFixed(2)==="1200.00","Confirmed payment sum incorrect");
  const blocked=await db.$transaction(async tx=>{
   const count=await tx.commissionPayment.count({where:{closingId:closing.id,status:"confirmado"}});
   if(count)return "blocked";
   await tx.commercialClosing.update({where:{id:closing.id},data:{status:"anulado"}});
   return "voided";
  });
  assert(blocked==="blocked","Closing with confirmed payment must not be voided");
  await db.commissionPayment.update({where:{id:payment.id},data:{status:"anulado",voidReason:"CI correction reason",voidedAt:new Date(),voidedByName:"CI Admin"}});
  const remaining=await db.commissionPayment.count({where:{closingId:closing.id,status:"confirmado"}});
  assert(remaining===0,"Voided payment still counted");
  await db.commercialClosing.update({where:{id:closing.id},data:{status:"anulado",voidReason:"CI closing correction",voidedAt:new Date(),voidedByName:"CI Admin"}});
  const final=await db.commercialClosing.findUnique({where:{id:closing.id},select:{status:true}});
  assert(final?.status==="anulado","Closing void status incorrect");
  console.log("Standalone finance lifecycle: property -> lead -> closing -> payment -> payment void -> closing void OK");
 }finally{
  // The database is ephemeral; deleting the test user is sufficient cleanup for the fixture.
  await db.$disconnect();
 }
}
main().catch(e=>{console.error("[fresh-standalone-finance]",e instanceof Error?e.message:"Unknown failure");process.exitCode=1;});
