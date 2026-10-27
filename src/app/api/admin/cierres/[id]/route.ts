import {NextRequest} from "next/server";
import {prisma} from "@/lib/prisma";
import {requireAdmin} from "@/lib/auth";
import {tenantModuleEnabled} from "@/lib/tenant-modules";
import {commissionTableReady} from "@/lib/commission-schema";
import {propertyRedirect,validMutationOrigin} from "@/lib/admin-property-request";
export const runtime="nodejs";
const back=(error:string)=>propertyRedirect("/admin/cierres?error="+encodeURIComponent(error));
export async function POST(req:NextRequest,{params}:{params:Promise<{id:string}>}){
 const admin=await requireAdmin();
 if(!await tenantModuleEnabled(admin.tenantId,"closings"))return new Response("Módulo desactivado",{status:403});
 if(!admin.roles.includes("admin"))return back("permisos");
 if(!validMutationOrigin(req))return back("origen");
 const {id}=await params;
 const len=Number(req.headers.get("content-length")||0);
 if(id.length>100||!Number.isSafeInteger(len)||len>5000)return back("datos");
 let form:FormData;try{form=await req.formData();}catch{return back("datos");}
 if(form.get("intent")!=="void")return back("datos");
 const raw=form.get("reason");
 const reason=typeof raw==="string"?raw.trim():null;
 if(!reason||reason.length<10||reason.length>1000)return back("motivo");
 if(await commissionTableReady()){
  const payments=await prisma.commissionPayment.count({where:{tenantId:admin.tenantId,closingId:id,status:"confirmado"}});
  if(payments>0)return back("pagos");
 }
 const changed=await prisma.commercialClosing.updateMany({
  where:{id,tenantId:admin.tenantId,status:"confirmado"},
  data:{status:"anulado",voidReason:reason,voidedAt:new Date(),voidedByName:admin.name.slice(0,120)}
 });
 return changed.count?propertyRedirect("/admin/cierres?voided=1"):back("noexiste");
}
