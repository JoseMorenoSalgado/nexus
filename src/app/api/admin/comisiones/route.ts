import {NextRequest} from "next/server";
import {prisma} from "@/lib/prisma";
import {requireAdmin} from "@/lib/auth";
import {tenantModuleEnabled} from "@/lib/tenant-modules";
import {commissionTableReady} from "@/lib/commission-schema";
import {decimalAmount,validClosedAt} from "@/lib/closing-utils";
import {cents} from "@/lib/commission-ledger";
import {validMutationOrigin,propertyRedirect} from "@/lib/admin-property-request";
export const runtime="nodejs";
const back=(code:string)=>propertyRedirect("/admin/cierres/comisiones?error="+code);
const methods=["transferencia","efectivo","cheque","otro"] as const;
export async function POST(req:NextRequest){
 const user=await requireAdmin();
 if(!await tenantModuleEnabled(user.tenantId,"closings"))return new Response("Módulo desactivado",{status:403});
 if(!user.roles.includes("admin"))return back("permisos");
 if(!validMutationOrigin(req))return back("origen");
 const len=Number(req.headers.get("content-length")||0);
 if(!Number.isSafeInteger(len)||len>10000)return back("datos");
 if(!await commissionTableReady())return back("inactivo");
 let form:FormData;try{form=await req.formData();}catch{return back("datos");}
 const string=(key:string,max:number)=>{
  const v=form.get(key);return typeof v==="string"&&v.length<=max?v.trim():null;
 };
 const closingId=string("closingId",100),method=string("method",30);
 const reference=string("reference",120),notes=string("notes",1000);
 const paidAt=validClosedAt(form.get("paidAt"));
 const amount=decimalAmount(form.get("amount"));
 if(!closingId||!amount||!paidAt||!method||!methods.some(m=>m===method)||reference===null||notes===null)return back("datos");
 try{
  const outcome=await prisma.$transaction(async tx=>{
   // Lock the parent closing row to serialize simultaneous installments and prevent overpayment.
   const lock=await tx.commercialClosing.updateMany({
    where:{id:closingId,tenantId:user.tenantId,status:"confirmado"},
    data:{updatedAt:new Date()}
   });
   if(!lock.count)return "noexiste";
   const closing=await tx.commercialClosing.findFirst({
    where:{id:closingId,tenantId:user.tenantId,status:"confirmado"},
    select:{closedAt:true,commissionAmount:true}
   });
   if(!closing)return "noexiste";
   if(paidAt.getTime()<new Date(Date.UTC(closing.closedAt.getUTCFullYear(),closing.closedAt.getUTCMonth(),closing.closedAt.getUTCDate())).getTime())return "fecha";
   const aggregate=await tx.commissionPayment.aggregate({
    where:{tenantId:user.tenantId,closingId,status:"confirmado"},_sum:{amount:true}
   });
   const remaining=cents(closing.commissionAmount.toFixed(2))-cents(aggregate._sum.amount?.toFixed(2)||"0.00");
   if(cents(amount)>remaining)return "saldo";
   await tx.commissionPayment.create({data:{
    tenantId:user.tenantId,closingId,amount,paidAt,method,
    reference:reference||null,notes:notes||null,createdByName:user.name.slice(0,120)
   }});
   return "ok";
  },{isolationLevel:"Serializable"});
  return outcome==="ok"?propertyRedirect("/admin/cierres/comisiones?created=1"):back(outcome);
 }catch(error){
  console.error("[commissions] payment registration failed",error instanceof Error?error.name:"unknown");
  return back("servidor");
 }
}
