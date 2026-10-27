import "server-only";
import {prisma} from "@/lib/prisma";
import type {PublicProperty} from "@/lib/demo";
import type {Prisma} from "@prisma/client";

export const CATALOG_PAGE_SIZE=12;
export type CatalogSort="recientes"|"precio-asc"|"precio-desc";
export type CatalogFilters={operacion:string;tipo:string;ubicacion:string;ciudad?:string;codigo?:string;precioMin?:number;precioMax?:number;orden?:CatalogSort};
export async function getCatalogPage(tenantId:string,filters:CatalogFilters,page:number){
 const where:Prisma.PropertyWhereInput={
  tenantId,published:true,
  ...(filters.operacion==="venta"||filters.operacion==="alquiler"?{operation:filters.operacion}:{}),
  ...(filters.tipo?{type:filters.tipo}:{}),
  ...(filters.ciudad?{city:filters.ciudad}:{}),
  ...(filters.codigo?{refCode:filters.codigo}:{}),
  ...(filters.precioMin!==undefined||filters.precioMax!==undefined?{price:{...(filters.precioMin!==undefined?{gte:filters.precioMin}:{}),...(filters.precioMax!==undefined?{lte:filters.precioMax}:{})}}:{}),
  ...(filters.ubicacion?{OR:[
   {city:{contains:filters.ubicacion}},
   {neighborhood:{contains:filters.ubicacion}}
  ]}:{})
 };
 const count=await prisma.property.count({where});
 const totalPages=Math.max(1,Math.ceil(count/CATALOG_PAGE_SIZE));
 const currentPage=Math.min(Math.max(1,Math.floor(page)||1),totalPages);
 const rows=await prisma.property.findMany({
  where,orderBy:filters.orden==="precio-asc"?[{price:"asc" as const},{id:"desc" as const}]:filters.orden==="precio-desc"?[{price:"desc" as const},{id:"desc" as const}]:[{createdAt:"desc" as const},{id:"desc" as const}],
  skip:(currentPage-1)*CATALOG_PAGE_SIZE,take:CATALOG_PAGE_SIZE,
  select:{id:true,slug:true,refCode:true,title:true,description:true,city:true,neighborhood:true,type:true,operation:true,price:true,bedrooms:true,bathrooms:true,areaM2:true,photos:{orderBy:{sortOrder:"asc"},take:1,select:{url:true}}}
 });
 const properties:PublicProperty[]=rows.map(p=>({
  id:p.id,slug:p.slug,refCode:p.refCode,title:p.title,description:p.description,
  city:p.city,neighborhood:p.neighborhood||"",type:p.type,
  operation:p.operation==="alquiler"?"alquiler":"venta",price:Number(p.price),
  bedrooms:p.bedrooms||0,bathrooms:p.bathrooms||0,areaM2:p.areaM2||0,
  image:p.photos[0]?.url||"",photos:p.photos.map(photo=>photo.url)
 }));
 return {properties,count,currentPage,totalPages};
}

/** Bounded tenant-scoped suggestions, rendered as native HTML datalist. */
export async function getCatalogLocationSuggestions(tenantId:string):Promise<string[]>{
 const where={tenantId,published:true};
 const [cities,zones]=await Promise.all([
  prisma.property.findMany({where,distinct:["city"],select:{city:true},take:20,orderBy:{city:"asc"}}),
  prisma.property.findMany({where:{...where,neighborhood:{not:null}},distinct:["neighborhood"],select:{neighborhood:true},take:20,orderBy:{neighborhood:"asc"}})
 ]);
 return [...new Set([...cities.map(p=>p.city),...zones.map(p=>p.neighborhood||"")].map(v=>v.trim()).filter(Boolean))].slice(0,40);
}
