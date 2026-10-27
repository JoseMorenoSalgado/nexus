import {NextRequest} from "next/server";
import {prisma} from "@/lib/prisma";
import {requireAdmin} from "@/lib/auth";
import {parseSiteSettings,saveSiteSettings,validateBrandContact,SiteSettingsError} from "@/lib/site-settings";
import {propertyRedirect,validMutationOrigin} from "@/lib/admin-property-request";

export const runtime="nodejs";
export async function POST(req:NextRequest){
 const admin=await requireAdmin();
 if(!admin.roles.some(r=>["admin","editor"].includes(r)))return propertyRedirect("/admin/personalizar?error=permisos");
 if(!validMutationOrigin(req))return propertyRedirect("/admin/personalizar?error=origen");
 const size=Number(req.headers.get("content-length")||0);
 if(!Number.isSafeInteger(size)||size<1||size>17000)return propertyRedirect("/admin/personalizar?error=datos");
 try{
  const form=await req.formData();
  const settings=parseSiteSettings(form);
  const company=await prisma.tenant.findUniqueOrThrow({where:{id:admin.tenantId},select:{name:true}});
  const brand=validateBrandContact(form,{legacyLocalCode:company.name.trim().toLowerCase()==="nexus real estate"?"505":undefined});
  if(settings.featuredIds.length){
   const valid=await prisma.property.count({where:{tenantId:admin.tenantId,id:{in:settings.featuredIds},published:true}});
   if(valid!==settings.featuredIds.length)return propertyRedirect("/admin/personalizar?error=destacadas");
  }
  // Separate writes keep the existing tenant and page records compatible with old databases.
  await prisma.tenant.update({where:{id:admin.tenantId},data:brand});
  await saveSiteSettings(admin.tenantId,settings);
  return propertyRedirect("/admin/personalizar?saved=1");
 }catch(e){
  if(e instanceof SiteSettingsError)return propertyRedirect("/admin/personalizar?error=datos");
  console.error("[site-settings] update",e instanceof Error?e.name:"unknown");
  return propertyRedirect("/admin/personalizar?error=servidor");
 }
}
