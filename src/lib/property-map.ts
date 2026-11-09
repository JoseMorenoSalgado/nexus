import "server-only";
import type {Prisma} from "@/generated/standalone-postgres";
import {getStandalonePrisma} from "@/lib/prisma-standalone";
import {PropertyFormError} from "@/lib/property-form";

export type PropertyLocation={latitude:number;longitude:number;address:string};
export type PropertyMapPoint=PropertyLocation & {id:string;slug:string;title:string};
const prefix="_property-location-";
const slug=(id:string)=>prefix+id;

function validCoordinates(latitude:number,longitude:number){
 return Number.isFinite(latitude)&&Math.abs(latitude)<=85&&Number.isFinite(longitude)&&Math.abs(longitude)<=180;
}

export function parsePropertyLocation(form:FormData):PropertyLocation|null|undefined{
 if(!form.has("mapLatitude")&&!form.has("mapLongitude")&&!form.has("mapAddress"))return undefined;
 const read=(name:string)=>String(form.get(name)??"").trim();
 const lat=read("mapLatitude"),lng=read("mapLongitude"),address=read("mapAddress");
 if(!lat&&!lng&&!address)return null;
 const decimal=/^-?\d+(?:[.,]\d{1,6})?$/;
 const latitude=Number(lat.replace(",",".")),longitude=Number(lng.replace(",","."));
 if(!decimal.test(lat)||!decimal.test(lng)||!validCoordinates(latitude,longitude)||address.length>180){
  throw new PropertyFormError("ubicacion");
 }
 return {latitude,longitude,address};
}

function decode(value:Prisma.JsonValue):PropertyLocation|null{
 if(!value||typeof value!=="object"||Array.isArray(value))return null;
 const {latitude,longitude,address}=value;
 if(typeof latitude!=="number"||typeof longitude!=="number"||typeof address!=="string"||!validCoordinates(latitude,longitude))return null;
 return {latitude,longitude,address};
}

// Reserved site content records hold the optional public pin without a schema change.
export async function savePropertyLocation(tx:Prisma.TransactionClient,id:string,location:PropertyLocation|null|undefined){
 if(location===undefined)return;
 if(location===null){
  await tx.sitePage.deleteMany({where:{slug:slug(id)}});
  return;
 }
 await tx.sitePage.upsert({
  where:{slug:slug(id)},
  create:{slug:slug(id),title:"Ubicación de propiedad",blocks:location},
  update:{blocks:location}
 });
}

export async function getPropertyLocation(id:string){
 const row=await getStandalonePrisma().sitePage.findUnique({where:{slug:slug(id)},select:{blocks:true}});
 return row?decode(row.blocks):null;
}

export async function getPropertyMapPoints(properties:{id:string;slug:string;title:string;city:string;neighborhood:string}[]):Promise<PropertyMapPoint[]>{
 if(!properties.length)return [];
 const rows=await getStandalonePrisma().sitePage.findMany({where:{slug:{startsWith:prefix}},select:{slug:true,blocks:true}});
 const locations=new Map(rows.map(row=>[row.slug,decode(row.blocks)]));
 return properties.flatMap(({id,slug:propertySlug,title,city,neighborhood})=>{
  const location=locations.get(slug(id));
  return location?[{...location,id,slug:propertySlug,title,address:location.address||[neighborhood,city].filter(Boolean).join(", ")}]:[];
 });
}
