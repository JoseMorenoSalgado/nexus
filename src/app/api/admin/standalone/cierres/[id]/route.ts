import {NextRequest,NextResponse} from "next/server";
import {currentAdmin} from "@/lib/auth";
import {getStandalonePrisma} from "@/lib/prisma-standalone";
import {validMutationOrigin} from "@/lib/admin-property-request";
export const runtime="nodejs";
export const dynamic="force-dynamic";
const fail=(error:string,status:number)=>NextResponse.json({error},{status,headers:{"Cache-Control":"no-store"}});
export async function POST(req:NextRequest,{params}:{params:Promise<{id:string}>}){
 if(process.env.NEXUS_STANDALONE!=="true")return fail("No disponible",404);
 const admin=await currentAdmin();
 if(!admin?.roles.includes("admin"))return fail("Solo un administrador puede anular cierres",403);
 if(!validMutationOrigin(req))return fail("Origen no permitido",403);
 const {id}=await params;
 const length=Number(req.headers.get("content-length")||0);
 if(!id||id.length>100||!Number.isSafeInteger(length)||length>5000)return fail("Datos inválidos",400);
 let form:FormData;
 try{form=await req.formData();}catch{return fail("Datos inválidos",400);}
 const reason=form.get("reason");
 if(form.get("intent")!=="void"||typeof reason!=="string"||reason.trim().length<10||reason.trim().length>1000)return fail("Indique un motivo de 10 a 1000 caracteres",400);
 const db=getStandalonePrisma();
 try{
  const outcome=await db.$transaction(async tx=>{
   // Lock the closing to serialize voids against financial writes.
   const lock=await tx.commercialClosing.updateMany({where:{id,status:"confirmado"},data:{updatedAt:new Date()}});
   if(!lock.count)return "noexiste";
   const payments=await tx.commissionPayment.count({where:{closingId:id,status:"confirmado"}});
   if(payments)return "pagos";
   const changed=await tx.commercialClosing.updateMany({where:{id,status:"confirmado"},data:{status:"anulado",voidReason:reason.trim(),voidedAt:new Date(),voidedByName:admin.name.slice(0,120)}});
   return changed.count?"ok":"noexiste";
  },{isolationLevel:"Serializable"});
  if(outcome==="pagos")return fail("No puede anular un cierre con pagos de comisión confirmados",409);
  if(outcome!=="ok")return fail("Cierre inexistente o anulado",404);
  return NextResponse.json({ok:true},{headers:{"Cache-Control":"no-store"}});
 }catch(e){console.error("[standalone-closings] void",e instanceof Error?e.name:"unknown");return fail("No se pudo anular el cierre",500);}
}
