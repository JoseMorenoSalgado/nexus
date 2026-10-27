import {NextRequest} from "next/server";
import {requireAdmin} from "@/lib/auth";
import {tenantModuleEnabled} from "@/lib/tenant-modules";
import {closingTableReady} from "@/lib/closing-schema";
import {activateCommissionPayments} from "@/lib/commission-schema";
import {validMutationOrigin,propertyRedirect} from "@/lib/admin-property-request";
const back=(code:string)=>propertyRedirect("/admin/cierres/comisiones?error="+code);
export async function POST(req:NextRequest){
 const user=await requireAdmin();
 if(!await tenantModuleEnabled(user.tenantId,"closings"))return new Response("Módulo desactivado",{status:403});
 if(!user.roles.includes("admin"))return back("permisos");
 if(!validMutationOrigin(req))return back("origen");
 if(!await closingTableReady())return back("sin-cierres");
 const len=Number(req.headers.get("content-length")||0);
 if(!Number.isSafeInteger(len)||len>2000)return back("datos");
 let form:FormData;try{form=await req.formData();}catch{return back("datos");}
 if(form.get("backupConfirmed")!=="yes")return back("respaldo");
 try{await activateCommissionPayments();return propertyRedirect("/admin/cierres/comisiones?activated=1");}
 catch(e){console.error("[commissions] activation error",e instanceof Error?e.name:"unknown");return back("servidor");}
}
