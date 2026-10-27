import {NextRequest} from "next/server";
import {requireAdmin} from "@/lib/auth";
import {propertyRedirect,validMutationOrigin} from "@/lib/admin-property-request";
import {saveSiteMenu} from "@/lib/site-pages";
export const runtime="nodejs";
export async function POST(req:NextRequest){
 const admin=await requireAdmin();
 if(!admin.roles.some(r=>["admin","editor"].includes(r)))return propertyRedirect("/admin/personalizar/menu?error=permisos");
 if(!validMutationOrigin(req))return propertyRedirect("/admin/personalizar/menu?error=origen");
 const size=Number(req.headers.get("content-length")||0);
 if(!Number.isSafeInteger(size)||size<1||size>12000)return propertyRedirect("/admin/personalizar/menu?error=datos");
 try{
  const form=await req.formData(),raw=form.get("items");
  if(typeof raw!=="string"||raw.length>7500)return propertyRedirect("/admin/personalizar/menu?error=datos");
  const values:unknown=JSON.parse(raw);
  if(!Array.isArray(values)||values.length>25||values.some(x=>!x||typeof x!=="object"||Array.isArray(x)
    ||typeof x.id!=="string"||typeof x.label!=="string"))return propertyRedirect("/admin/personalizar/menu?error=datos");
  const typed=values as {id:string;label:string}[];
  if(new Set(typed.map(x=>x.id)).size!==typed.length)return propertyRedirect("/admin/personalizar/menu?error=datos");
  await saveSiteMenu(admin.tenantId,typed);
  return propertyRedirect("/admin/personalizar/menu?saved=1");
 }catch(e){if(e instanceof SyntaxError||e instanceof Error&&e.message.startsWith("MENU_"))return propertyRedirect("/admin/personalizar/menu?error=datos");
  console.error("[site-menu] save",e instanceof Error?e.name:"unknown");
  return propertyRedirect("/admin/personalizar/menu?error=servidor");
 }
}
