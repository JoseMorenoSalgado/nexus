import "server-only";
import {hasSiteAsset} from "@/lib/site-assets";
import {getStandalonePrisma} from "@/lib/prisma-standalone";
import type {PublicProperty,PublicTenant} from "@/lib/demo";

/**
 * Standalone public context for new installations.
 * Unlike legacy getPublicContext, no Host-to-tenant lookup is performed.
 * Caller is responsible for HTTPS/origin validation on protected resources.
 */
export async function getStandalonePublicContext(options:{loadProperties?:boolean}={}):Promise<{
 tenant:PublicTenant;properties:PublicProperty[];demo:false
}|null>{
 const db=getStandalonePrisma();
 const config=await db.siteConfig.findUnique({where:{id:"main"}});
 if(!config)return null;
 const props=options.loadProperties===false?[]:await db.property.findMany({
  where:{published:true},
  select:{
   id:true,slug:true,refCode:true,title:true,description:true,city:true,
   neighborhood:true,type:true,operation:true,price:true,bedrooms:true,
   bathrooms:true,areaM2:true,photos:{orderBy:{sortOrder:"asc"},select:{url:true}}
  },
  orderBy:{createdAt:"desc"}
 });
 return {
  tenant:{
   id:config.id,name:config.name,tagline:config.tagline||"",
   whatsapp:config.whatsapp||"",logoUrl:await hasSiteAsset("main","logo")?"/api/site-media/logo":config.logoUrl||"",
   contactEmail:config.contactEmail||"",primaryColor:config.primaryColor
  },
  properties:props.map(p=>({
   id:p.id,slug:p.slug,refCode:p.refCode,title:p.title,
   description:p.description,city:p.city,neighborhood:p.neighborhood||"",
   type:p.type,operation:p.operation==="alquiler"?"alquiler":"venta",
   price:Number(p.price),bedrooms:p.bedrooms||0,bathrooms:p.bathrooms||0,
   areaM2:p.areaM2||0,image:p.photos[0]?.url||"",
   photos:p.photos.map(photo=>photo.url)
  })),
  demo:false
 };
}
