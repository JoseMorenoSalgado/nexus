import {headers} from "next/headers";
import {notFound,redirect} from "next/navigation";
import {hasDatabaseConfig} from "@/lib/server-config";
import {isPreviewHost,normalizeSiteHost} from "@/lib/preview";
import {prisma} from "@/lib/prisma";
import {demoTenant,demoProperties,type PublicTenant,type PublicProperty} from "@/lib/demo";
import {getSiteSettings,DEFAULT_SITE_SETTINGS,type SiteSettings} from "@/lib/site-settings";
import {hasSiteAsset} from "@/lib/site-assets";
export const canonicalHost = normalizeSiteHost;
export async function tenantFromHost(hostname:string){
 if(!hasDatabaseConfig())return null;
 const d=await prisma.domain.findUnique({where:{hostname:canonicalHost(hostname)},select:{tenantId:true,tenant:{select:{id:true,name:true,tagline:true,whatsapp:true,logoUrl:true,contactEmail:true,primaryColor:true,active:true}}}});
 return d?.tenant.active?d:null;
}
export async function getPublicContext(options:{loadProperties?:boolean}={}):Promise<{tenant:PublicTenant;properties:PublicProperty[];demo:boolean;settings:SiteSettings;heroImage:boolean}>{
 const h=await headers();
 const hostname=h.get("host")||"";
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
