import "server-only";
import {getStandalonePrisma} from "@/lib/prisma-standalone";
const slug="_property-display-settings";
export const DEFAULT_PROPERTY_DISPLAY={showInquiry:false,showPdfName:false,showPdfQr:false};
export type PropertyDisplay=typeof DEFAULT_PROPERTY_DISPLAY;
export function normalizePropertyDisplay(value:unknown):PropertyDisplay{
 if(!value||typeof value!=="object"||Array.isArray(value))return {...DEFAULT_PROPERTY_DISPLAY};
 const v=value as Record<string,unknown>;
 return {showInquiry:v.showInquiry===true,showPdfName:v.showPdfName===true,showPdfQr:v.showPdfQr===true};
}
export async function getPropertyDisplay(){
 const row=await getStandalonePrisma().sitePage.findUnique({where:{slug},select:{blocks:true}});
 return normalizePropertyDisplay(row?.blocks);
}
export async function savePropertyDisplay(blocks:PropertyDisplay){
 await getStandalonePrisma().sitePage.upsert({where:{slug},create:{slug,title:"Presentación de propiedades",blocks,published:false},update:{blocks}});
}
