import {NextRequest} from "next/server";
import {requireAdmin} from "@/lib/auth";
import {repairCommercialSchema} from "@/lib/commercial-schema";
import {propertyRedirect,validMutationOrigin} from "@/lib/admin-property-request";
export const runtime="nodejs";
export async function POST(req:NextRequest){
 const admin=await requireAdmin();
 if(!admin.roles.includes("admin"))return propertyRedirect("/admin");
 if(!validMutationOrigin(req))return propertyRedirect("/admin/sistema?status=failed");
 const length=Number(req.headers.get("content-length")||0);
 if(!Number.isSafeInteger(length)||length>2000)return propertyRedirect("/admin/sistema?status=failed");
 let form:FormData;
 try{form=await req.formData();}catch{return propertyRedirect("/admin/sistema?status=failed");}
 if(form.get("backupConfirmed")!=="yes")return propertyRedirect("/admin/sistema?status=failed");
 try{
  const status=await repairCommercialSchema();
  return propertyRedirect("/admin/sistema?status="+(status.ready?"repaired":"failed"));
 }catch(error){
  console.error("[schema-recovery] migration incomplete",error instanceof Error?error.name:"unknown");
  return propertyRedirect("/admin/sistema?status=failed");
 }
}
