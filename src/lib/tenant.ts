import {headers} from "next/headers";
import {reportPublicDiagnostic} from "@/lib/site-diagnostics";
import {isAllowedPublicHost} from "@/lib/public-site/host-match";
import {publicPageHostname} from "@/lib/public-request-origin";
import {notFound,redirect} from "next/navigation";
import {hasDatabaseConfig} from "@/lib/server-config";
import {isPreviewHost,normalizeSiteHost} from "@/lib/preview";
import {prisma} from "@/lib/prisma";
import {getStandalonePrisma} from "@/lib/prisma-standalone";
import {singleInstallationTenantId} from "@/lib/single-installation";
import {demoTenant,demoProperties,type PublicTenant,type PublicProperty} from "@/lib/demo";
import {getSiteSettings,DEFAULT_SITE_SETTINGS,type SiteSettings} from "@/lib/site-settings";
import {hasSiteAsset} from "@/lib/site-assets";
export const canonicalHost = normalizeSiteHost;
/** Standalone installation: organization is resolved from the local database, not the HTTP host. */
export async function standaloneOrganization(){
 if(!hasDatabaseConfig())return null;
 if(process.env.NEXUS_STANDALONE==="true"){
  const site=await getStandalonePrisma().siteConfig.findUnique({where:{id:"main"}});
  if(!site)return null;
  return {tenantId:"main",tenant:{id:"main",name:site.name,tagline:site.tagline,whatsapp:site.whatsapp,logoUrl:site.logoUrl,contactEmail:site.contactEmail,primaryColor:site.primaryColor,active:true}};
 }
 const tenantId=await singleInstallationTenantId();
 if(!tenantId)return null;
 const tenant=await prisma.tenant.findUnique({where:{id:tenantId},select:{id:true,name:true,tagline:true,whatsapp:true,logoUrl:true,contactEmail:true,primaryColor:true,active:true}});
 return tenant?.active?{tenantId,tenant}:null;
}
/** Host-validated access for documents, API resources and other existing callers. */
export async function tenantFromHost(hostname:string){
 const resolved=await standaloneOrganization();
 if(!resolved)return null;
 const configured=(process.env.SITE_URL||process.env.APP_URL||process.env.NEXT_PUBLIC_SITE_URL||"").trim();
 const requested=canonicalHost(hostname);
 if(!requested)return null;
 const domains=configured||process.env.NEXUS_STANDALONE==="true"?[]:await prisma.domain.findMany({where:{tenantId:resolved.tenantId},select:{hostname:true},take:100});
 return isAllowedPublicHost(requested,configured,domains.map(d=>d.hostname))?resolved:null;
}
export async function getPublicContext(options:{loadProperties?:boolean}={}):Promise<{tenant:PublicTenant;properties:PublicProperty[];demo:boolean;settings:SiteSettings;heroImage:boolean}>{
 const h=await headers();
 const hostname=publicPageHostname(h)||"";
 const preview=isPreviewHost(hostname);
 const demoContext={tenant:demoTenant,properties:demoProperties,demo:true,settings:DEFAULT_SITE_SETTINGS,heroImage:false} as const;
 if(!hasDatabaseConfig()){
   if(preview)return demoContext;
   if(process.env.NODE_ENV!=="production")return demoContext;
   reportPublicDiagnostic("PUBLIC_DATABASE_MISSING",{path:"public"});
   redirect("/instalar");
 }
 if(process.env.NEXUS_STANDALONE==="true"){
  const db=getStandalonePrisma();
  const site=await db.siteConfig.findUnique({where:{id:"main"}});
  if(!site){
   reportPublicDiagnostic("PUBLIC_TENANT_REJECTED",{reason:"standalone_site_config_missing"});
   notFound();
  }
  const [props,settings]=await Promise.all([
   options.loadProperties===false?Promise.resolve([]):db.property.findMany({where:{published:true},select:{id:true,slug:true,refCode:true,title:true,description:true,city:true,neighborhood:true,type:true,operation:true,price:true,bedrooms:true,bathrooms:true,areaM2:true,featured:true,photos:{orderBy:{sortOrder:"asc"},select:{url:true}}},orderBy:{createdAt:"desc"}}),
   getSiteSettings("main")
  ]);
  const prioritized=[...props].sort((a,b)=>{
   const rank=(id:string)=>{const i=settings.featuredIds.indexOf(id);return i===-1?999:i;};
   return rank(a.id)-rank(b.id)||Number(b.featured)-Number(a.featured);
  });
  return {tenant:{id:"main",name:site.name,tagline:site.tagline||"",whatsapp:site.whatsapp||"",logoUrl:site.logoUrl||"",contactEmail:site.contactEmail||"",primaryColor:site.primaryColor||"#CB2027"},demo:false,settings,heroImage:false,properties:prioritized.map(p=>({
   id:p.id,slug:p.slug,refCode:p.refCode,title:p.title,description:p.description,city:p.city,neighborhood:p.neighborhood||"",type:p.type,
   operation:p.operation==="alquiler"?"alquiler" as const:"venta" as const,price:Number(p.price),
   bedrooms:p.bedrooms||0,bathrooms:p.bathrooms||0,areaM2:p.areaM2||0,image:p.photos[0]?.url||"",photos:p.photos.map(x=>x.url)
  }))};
 }
 let d:Awaited<ReturnType<typeof tenantFromHost>>;
 try{d=await standaloneOrganization();}
 catch(error){
   if(!preview){reportPublicDiagnostic("PUBLIC_CONTEXT_EXCEPTION",{errorType:error instanceof Error?error.name:"unknown"});throw error;}
   console.warn("Preview mode: database not ready");
   return demoContext;
 }
 if(!d){
   if(preview)return demoContext;
   reportPublicDiagnostic("PUBLIC_TENANT_REJECTED",{reason:"standalone_organization_unavailable"});
   notFound();
 }
 const [props,settings,heroImage,customLogo]=await Promise.all([
  options.loadProperties===false?Promise.resolve([]):prisma.property.findMany({where:{tenantId:d.tenantId,published:true},select:{id:true,slug:true,refCode:true,title:true,description:true,city:true,neighborhood:true,type:true,operation:true,price:true,bedrooms:true,bathrooms:true,areaM2:true,featured:true,photos:{orderBy:{sortOrder:"asc"},select:{url:true}}},orderBy:{createdAt:"desc"}}),
  getSiteSettings(d.tenantId),hasSiteAsset(d.tenantId,"hero"),hasSiteAsset(d.tenantId,"logo")
 ]);
 const prioritized=[...props].sort((a,b)=>{
  const rank=(id:string)=>{const i=settings.featuredIds.indexOf(id);return i===-1?999:i;};
  return rank(a.id)-rank(b.id)||Number(b.featured)-Number(a.featured);
 });
 return {tenant:{id:d.tenant.id,name:d.tenant.name,tagline:d.tenant.tagline||"",whatsapp:d.tenant.whatsapp||"",logoUrl:customLogo?"/api/site-media/logo":d.tenant.logoUrl||"",contactEmail:d.tenant.contactEmail||"",primaryColor:d.tenant.primaryColor||"#CB2027"},demo:false,settings,heroImage,properties:prioritized.map(p=>({
 id:p.id,slug:p.slug,refCode:p.refCode,title:p.title,description:p.description,city:p.city,neighborhood:p.neighborhood||"",type:p.type,
 operation:p.operation==="alquiler"?"alquiler" as const:"venta" as const,price:Number(p.price),
 bedrooms:p.bedrooms||0,bathrooms:p.bathrooms||0,areaM2:p.areaM2||0,image:p.photos[0]?.url||"",photos:p.photos.map(x=>x.url)
 }))};
}
