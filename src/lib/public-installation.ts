import "server-only";
import {hasDatabaseConfig} from "@/lib/server-config";
import {prisma} from "@/lib/prisma";
import {singleInstallationTenantId} from "@/lib/single-installation";

/**
 * Public content belongs to the same sole local organization as the dashboard.
 * HTTP Host, SITE_URL and legacy Domain rows do not select an organization in
 * a standalone deployment. Enhance may replace Host with an internal upstream.
 * Keep tenantId scoping and publication checks at every resource boundary.
 * This resolver does not authorize admin access or validate form origins.
 */
export async function publicInstallationTenant(){
 if(!hasDatabaseConfig())return null;
 const tenantId=await singleInstallationTenantId();
 if(!tenantId)return null;
 const tenant=await prisma.tenant.findUnique({where:{id:tenantId},select:{id:true,name:true,tagline:true,whatsapp:true,logoUrl:true,contactEmail:true,primaryColor:true,active:true}});
 return tenant?.active?{tenantId,tenant}:null;
}
