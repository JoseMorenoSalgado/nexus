import {headers} from "next/headers";
import {publicRequestHostname} from "@/lib/public-request-origin";
import {notFound,redirect} from "next/navigation";
import {hasDatabaseConfig} from "@/lib/server-config";
import {isPreviewHost,normalizeSiteHost} from "@/lib/preview";
import {prisma} from "@/lib/prisma";
import {singleInstallationTenantId} from "@/lib/single-installation";
import {demoTenant,demoProperties,type PublicTenant,type PublicProperty} from "@/lib/demo";
import {getSiteSettings,DEFAULT_SITE_SETTINGS,type SiteSettings} from "@/lib/site-settings";
import {hasSiteAsset} from "@/lib/site-assets";
export const canonicalHost = normalizeSiteHost;
/** Legacy API name retained for callers; hostname no longer selects an organization.
 * Each isolated database must contain exactly one active organization.
 */
export async function tenantFromHost(hostname:string){
 if(!hasDatabaseConfig())return null;
 // Domain is an origin allowlist, never an organization selector.
 const configured=process.env.SITE_URL||process.env.APP_URL||process.env.NEXT_PUBLIC_SITE_URL;
 const allowedHost=configured?canonicalHost(new URL(configured).hostname):"localhost";
 const requestedHost=canonicalHost(hostname);
 const expectedHost=canonicalHost(allowedHost);
 const apex=(host:string)=>host.startsWith("www.")?host.slice(4):host;
 if(apex(requestedHost)!==apex(expectedHost))return null;
 const tenantId=await singleInstallationTenantId();
 if(!tenantId)return null;
 const tenant=await prisma.tenant.findUnique({where:{id:tenantId},select:{id:true,name:true,tagline:true,whatsapp:true,logoUrl:true,contactEmail:true,primaryColor:true,active:true}});
 return tenant?.active?{tenantId,tenant}:null;
}
export async function getPublicContext(options:{loadProperties?:boolean}={}):Promise<{tenant:PublicTenant;properties:PublicProperty[];demo:boolean;settings:SiteSettings;heroImage:boolean}>{
 const h=await headers();
 const hostname=publicRequestHostname(h)||"";
 const preview=isPreviewHost(hostname);
 const demoContext={tenant:demoTenant,properties:demoProperties,demo:true,settings:DEFAULT_SITE_SETTINGS,heroImage:false} as const;
 if(!hasDatabaseConfig()){
   if(preview)return demoContext;
   if(process.env.NODE_ENV!=="production")return demoContext;
   redirect("/instalar");
 }
 let d:Awaited<ReturnType<typeof tenantFromHost>>;
 try{d=await tenantFromHost(hostname);}
 catch(error){
   if(!preview)throw error;
   console.warn("Preview mode: database not ready");
   return demoContext;
 }
 if(!d){
   if(preview)return demoContext;
   console.error("[public-site] Site unavailable: verify SITE_URL, canonical hostname, and exactly one active standalone organization. No tenant data was exposed.");
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
