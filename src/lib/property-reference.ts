import "server-only";
import {prisma} from "@/lib/prisma";
import {propertySlug} from "@/lib/property-form";
import type {Prisma} from "@prisma/client";

export const DEFAULT_REFERENCE_PREFIX="NRE";
export function validReferencePrefix(value:string){
 return /^[A-Z][A-Z0-9-]{0,10}[A-Z0-9]$/.test(value);
}
export function formatPropertyReference(prefix:string,number:number){
 if(!validReferencePrefix(prefix)||!Number.isSafeInteger(number)||number<1||number>999999999)return "";
 return prefix+"-"+String(number).padStart(6,"0");
}
/** One serializable transaction claims the counter and writes the property.
 * Existing codes are never edited; collisions with legacy references are skipped.
 * A serialization/unique conflict replays the whole transaction, never a partial write.
 */
export async function createPropertyWithReference(tenantId:string, data:Omit<Prisma.PropertyUncheckedCreateInput,"tenantId"|"refCode"|"slug">){
 for(let attempt=0;attempt<6;attempt++){
  try{
   return await prisma.$transaction(async tx=>{
    let counter=await tx.propertySequence.upsert({
     where:{tenantId},create:{tenantId,prefix:DEFAULT_REFERENCE_PREFIX,nextNumber:2},
     update:{nextNumber:{increment:1}}
    });
    for(let skip=0;skip<1000;skip++){
     const refCode=formatPropertyReference(counter.prefix,counter.nextNumber-1);
     if(!refCode)throw new Error("REFERENCE_EXHAUSTED");
     const used=await tx.property.findFirst({where:{tenantId,refCode},select:{id:true}});
     if(!used)return tx.property.create({data:{
      ...data,tenantId,refCode,slug:propertySlug(data.title,refCode)
     }});
     counter=await tx.propertySequence.update({where:{tenantId},data:{nextNumber:{increment:1}}});
    }
    throw new Error("REFERENCE_EXHAUSTED");
   },{isolationLevel:"Serializable",timeout:20000,maxWait:12000});
  }catch(error){
   const code=error&&typeof error==="object"&&"code" in error?error.code:"";
   if((code==="P2034"||code==="P2002")&&attempt<5){
    await new Promise(resolve=>setTimeout(resolve,25*(attempt+1)));
    continue;
   }
   throw error;
  }
 }
 throw new Error("REFERENCE_CONFLICT");
}
