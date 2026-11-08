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
 if(!admin?.roles.includes("admin"))return fail("Solo un administrador puede anular pagos",403);
 if(!validMutationOrigin(req))return fail("Origen no permitido",403);
 const {id}=await params;
 const length=Number(req.headers.get("content-length")||0);
 if(!id||id.length>100||!Number.isSafeInteger(length)||length>3000)return fail("Datos inválidos",400);
 let form:FormData;try{form=await req.formData();}catch{return fail("Datos inválidos",400);}
 const reason=form.get("reason");
 if(form.get("intent")!=="void"||typeof reason!=="string"||reason.trim().length<10||reason.trim().length>1000)return fail("Indique un motivo de 10 a 1000 caracteres",400);
 const db=getStandalonePrisma();
 try{
  const updated=await db.commissionPayment.updateMany({where:{id,status:"confirmado"},data:{status:"anulado",voidReason:reason.trim(),voidedAt:new Date(),voidedByName:admin.name.slice(0,120)}});
  if(!updated.count)return fail("Pago inexistente o anulado",404);
  return NextResponse.json({ok:true},{headers:{"Cache-Control":"no-store"}});
 }catch(e){console.error("[standalone-commissions] void",e instanceof Error?e.name:"unknown");return fail("No se pudo anular el pago",500);}
}
