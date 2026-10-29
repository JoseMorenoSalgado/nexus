import {NextRequest,NextResponse} from "next/server";
import {requireRole} from "@/lib/auth";
import {validMutationOrigin} from "@/lib/admin-property-request";
import {testTenantSmtp} from "@/lib/smtp-notifications";

export const runtime="nodejs";
export async function POST(req:NextRequest){
 const user=await requireRole(["admin"]);
 if(!validMutationOrigin(req))return new NextResponse("Origen no autorizado",{status:403});
 try{
  const outcome=await testTenantSmtp(user.tenantId);
  return new NextResponse(null,{status:303,headers:{
   Location:"/admin/integraciones?status=smtp-"+outcome,
   "Cache-Control":"no-store"
  }});
 }catch(error){
  console.warn("[smtp] test failed",error instanceof Error?error.name:"unknown");
  return new NextResponse(null,{status:303,headers:{Location:"/admin/integraciones?status=smtp-failed"}});
 }
}
