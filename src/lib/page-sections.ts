/** Browser-safe schema for custom-page blocks. No HTML/URLs from user input. */
export type PageSection=
 | {id:string;type:"heading";text:string}
 | {id:string;type:"text";text:string}
 | {id:string;type:"image";imageId:string;alt:string;caption:string};
const sectionId=/^[a-zA-Z0-9-]{6,90}$/;
export const pageImageId=/^[a-f0-9]{32}$/;
export const MAX_PAGE_SECTIONS=12;
export function normalizePageSections(raw:unknown,strict=false):PageSection[]{
 if(raw===undefined||raw===null)return [];
 if(!Array.isArray(raw)||raw.length>MAX_PAGE_SECTIONS){
  if(strict)throw new Error("SECTIONS_INVALID");return [];
 }
 const ids=new Set<string>(),result:PageSection[]=[];
 for(const item of raw){
  if(!item||typeof item!=="object"||Array.isArray(item)){
   if(strict)throw Error("SECTIONS_INVALID");continue;
  }
  const v=item as Record<string,unknown>;
  if(typeof v.id!=="string"||!sectionId.test(v.id)||ids.has(v.id)){
   if(strict)throw Error("SECTIONS_INVALID");continue;
  }
  let block:PageSection|undefined;
  if(v.type==="heading"||v.type==="text"){
   if(typeof v.text==="string"&&v.text.trim().length>=(v.type==="heading"?2:1)&&v.text.length<=(v.type==="heading"?140:1800)){
    block={id:v.id,type:v.type,text:v.text.trim()};
   }
  }else if(v.type==="image"){
   if(typeof v.imageId==="string"&&pageImageId.test(v.imageId)&&
      typeof v.alt==="string"&&v.alt.trim().length>=3&&v.alt.length<=180&&
      typeof v.caption==="string"&&v.caption.length<=220){
    block={id:v.id,type:"image",imageId:v.imageId,alt:v.alt.trim(),caption:v.caption.trim()};
   }
  }
  if(!block){if(strict)throw Error("SECTIONS_INVALID");continue;}
  ids.add(v.id);result.push(block);
 }
 if(strict&&result.length!==raw.length)throw Error("SECTIONS_INVALID");
 return result;
}
export function parseSectionsForm(value:FormDataEntryValue|null):PageSection[]|null{
 if(value===null)return null; // legacy forms: preserve existing sections on update
 if(typeof value!=="string"||value.length>20000)throw Error("SECTIONS_INVALID");
 try{return normalizePageSections(JSON.parse(value),true);}
 catch{throw Error("SECTIONS_INVALID");}
}
