import "server-only";
import {NextRequest,NextResponse} from "next/server";
import {requireAdmin} from "@/lib/auth";
import {canEditProperties,canManageUsers} from "@/lib/roles";
import {validPublicMutationOrigin} from "@/lib/public-request-origin";
export const MAX_PROPERTY_FORM_BYTES=128*1024;
export function propertyRedirect(path:string){
 return new NextResponse(null,{status:303,headers:{"Location":path,"Cache-Control":"no-store"}});
}
export function validMutationOrigin(req:NextRequest){
 return validPublicMutationOrigin(req.headers,process.env,
  path=>path==="/admin/propiedades"||path.startsWith("/admin/propiedades/")
 );
}
export function propertyErrorPath(code:string,id?:string){
 const root=id?"/admin/propiedades/"+encodeURIComponent(id)+"/editar":"/admin/propiedades/nueva";
 return root+"?error="+encodeURIComponent(code);
}
export function logPropertyError(action:string,error:unknown){
 const code=error&&typeof error==="object"&&"code" in error&&typeof error.code==="string"&&/^P\d{4}$/.test(error.code)?error.code:undefined;
 console.error("[properties] operation failed",{action,type:error instanceof Error?error.name:"unknown",code});
}
export async function propertyEditor(){
 const admin=await requireAdmin();
 return {tenantId:admin.tenantId,userId:admin.userId,roles:admin.roles,canEdit:admin.roles.some(canEditProperties),canManageAll:admin.roles.some(r=>r==="admin"||r==="editor"),canDelete:admin.roles.some(canManageUsers)};
}
