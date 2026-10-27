import {NextRequest} from "next/server";
import {prisma} from "@/lib/prisma";
import {requireAdmin} from "@/lib/auth";
import {tenantModuleEnabled} from "@/lib/tenant-modules";
import {validMutationOrigin,propertyRedirect} from "@/lib/admin-property-request";
export const runtime="nodejs";
const back=(code:string)=>propertyRedirect("/admin/cierres/comisiones?error="+code);
export async function POST(req:NextRequest,{params}:{params:Promise<{id:string}>}){
 const user=await requireAdmin();
 if(!await tenantModuleEnabled(user.tenantId,"closings"))return new Response("Módulo desactivado",{status:403});
 if(!user.roles.includes("admin"))return back("permisos");
 if(!validMutationOrigin(req))return back("origen");
 const {id}=await params;
 const length=Number(req.headers.get("content-length")||0);
 if(id.length>100||!Number.isSafeInteger(length)||length>3000)return back("datos");
 let form:FormData;try{form=await req.formData();}catch{return back("datos");}
 if(form.get("intent")!=="void")return back("datos");
 const r=form.get("reason");
 const reason=typeof r==="string"?r.trim():null;
 if(!reason||reason.length<10||reason.length>1000)return back("motivo");
 const found=await prisma.commissionPayment.findFirst({
  where:{id,tenantId:user.tenantId,status:"confirmado"},select:{id:true}
 });
 if(!found)return back("noexiste");
 const update=await prisma.commissionPayment.updateMany({
  where:{id,tenantId:user.tenantId,status:"confirmado"},
  data:{status:"anulado",voidReason:reason,voidedAt:new Date(),voidedByName:user.name.slice(0,120)}
 });
 return update.count?propertyRedirect("/admin/cierres/comisiones?voided=1"):back("noexiste");
}
