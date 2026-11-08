import {NextRequest,NextResponse} from "next/server";
import {currentAdmin} from "@/lib/auth";
import {getStandalonePrisma} from "@/lib/prisma-standalone";
import {validMutationOrigin} from "@/lib/admin-property-request";
export const runtime="nodejs";
export const dynamic="force-dynamic";
const fail=(error:string,status:number)=>NextResponse.json({error},{status,headers:{"Cache-Control":"no-store"}});
const cents=(s:string)=>{const [a,b=""]=s.split(".");return BigInt(a)*100n+BigInt(b.padEnd(2,"0"));};
export async function POST(req:NextRequest){
 if(process.env.NEXUS_STANDALONE!=="true")return fail("No disponible",404);
 const admin=await currentAdmin();
 if(!admin?.roles.includes("admin"))return fail("Solo un administrador puede registrar pagos",403);
 if(!validMutationOrigin(req))return fail("Origen no permitido",403);
 const length=Number(req.headers.get("content-length")||0);
 if(!Number.isSafeInteger(length)||length>10000)return fail("Solicitud demasiado grande",413);
 let form:FormData;try{form=await req.formData();}catch{return fail("Datos inválidos",400);}
 const val=(key:string,max:number)=>{const x=form.get(key);return typeof x==="string"&&x.length<=max?x.trim():null;};
 const closingId=val("closingId",100),amount=val("amount",30),paid=val("paidAt",10),method=val("method",30),reference=val("reference",120),notes=val("notes",1000);
 if(!closingId||!amount||!(/^(?:0|[1-9]\d{0,10})(?:\.\d{1,2})?$/.test(amount))||cents(amount)<=0n||!paid||!/^\d{4}-\d{2}-\d{2}$/.test(paid)||!method||!["transferencia","efectivo","cheque","otro"].includes(method)||reference===null||notes===null)return fail("Datos inválidos",400);
 const paidAt=new Date(paid+"T00:00:00.000Z");const today=new Date();today.setUTCHours(0,0,0,0);
 if(!Number.isFinite(paidAt.getTime())||paidAt.toISOString().slice(0,10)!==paid||paidAt>today||paidAt<new Date("2000-01-01"))return fail("Fecha inválida",400);
 const db=getStandalonePrisma();
 try{
  const outcome=await db.$transaction(async tx=>{
   const lock=await tx.commercialClosing.updateMany({where:{id:closingId,status:"confirmado"},data:{updatedAt:new Date()}});
   if(!lock.count)return "noexiste";
   const closing=await tx.commercialClosing.findUnique({where:{id:closingId},select:{closedAt:true,commissionAmount:true,status:true}});
   if(!closing||closing.status!=="confirmado")return "noexiste";
   if(paidAt.getTime()<Date.UTC(closing.closedAt.getUTCFullYear(),closing.closedAt.getUTCMonth(),closing.closedAt.getUTCDate()))return "fecha";
   const payments=await tx.commissionPayment.findMany({where:{closingId,status:"confirmado"},select:{amount:true}});
   const total=payments.reduce((sum,p)=>sum+cents(p.amount.toFixed(2)),0n);
   const remaining=cents(closing.commissionAmount.toFixed(2))-total;
   if(cents(amount)>remaining)return "saldo";
   await tx.commissionPayment.create({data:{closingId,amount,paidAt,method,reference:reference||null,notes:notes||null,createdByName:admin.name.slice(0,120)}});
   return "ok";
  },{isolationLevel:"Serializable"});
  if(outcome!=="ok")return fail(outcome==="saldo"?"El pago excede el saldo de comisión":outcome==="fecha"?"Fecha anterior al cierre":"Cierre inexistente o anulado",409);
  return NextResponse.json({ok:true},{status:201,headers:{"Cache-Control":"no-store"}});
 }catch(e){console.error("[standalone-commissions] create",e instanceof Error?e.name:"unknown");return fail("No se pudo registrar el pago",500);}
}
