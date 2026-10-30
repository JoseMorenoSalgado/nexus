import "server-only";
import {NextRequest,NextResponse} from "next/server";
import {requireAdmin} from "@/lib/auth";
import {canEditProperties,canManageUsers} from "@/lib/roles";
export function propertyRedirect(path:string){
 return new NextResponse(null,{status:303,headers:{"Location":path,"Cache-Control":"no-store"}});
}
export function validMutationOrigin(req:NextRequest){
 const origin=req.headers.get("origin"),host=req.headers.get("host");
 if(!origin||!host)return false;
 try{return new URL(origin).host.toLowerCase()===host.toLowerCase();}
 catch{return false;}
}
export function propertyErrorPath(code:string,id?:string){
 const root=id?"/admin/propiedades/"+encodeURIComponent(id)+"/editar":"/admin/propiedades/nueva";
 return root+"?error="+encodeURIComponent(code);
}
export async function propertyEditor(){
 const admin=await requireAdmin();
 return {tenantId:admin.tenantId,userId:admin.userId,roles:admin.roles,canEdit:admin.roles.some(canEditProperties),canManageAll:admin.roles.some(r=>r==="admin"||r==="editor"),canDelete:admin.roles.some(canManageUsers)};
}
