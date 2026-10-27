import {NextResponse} from "next/server";
import {requireAdmin} from "@/lib/auth";
import {listTenantMedia} from "@/lib/media-library";
export const runtime="nodejs";
export const dynamic="force-dynamic";
export async function GET(){
 const admin=await requireAdmin();
 if(!admin.roles.some(x=>x==="admin"||x==="editor"))
  return NextResponse.json({error:"Sin permisos."},{status:403});
 const items=await listTenantMedia(admin.tenantId);
 return NextResponse.json({items},{headers:{"Cache-Control":"private, no-store"}});
}
