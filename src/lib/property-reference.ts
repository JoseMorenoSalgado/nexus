import "server-only";
import {prisma} from "@/lib/prisma";
import {getStandalonePrisma} from "@/lib/prisma-standalone";
import type {Prisma as StandalonePrisma} from "@/generated/standalone-postgres";
import {propertySlug} from "@/lib/property-form";
import type {Prisma} from "@prisma/client";

import {savePropertyLocation,type PropertyLocation} from "@/lib/property-map";

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

/** Independent-site reference allocator; never queries Tenant or tenantId. */
export async function createStandalonePropertyWithReference(data:Omit<StandalonePrisma.PropertyUncheckedCreateInput,"refCode"|"slug">,location?:PropertyLocation|null){
 const db=getStandalonePrisma();
 for(let attempt=0;attempt<6;attempt++){
  try{
   return await db.$transaction(async tx=>{
    let counter=await tx.propertySequence.upsert({
     where:{id:"main"},create:{id:"main",prefix:DEFAULT_REFERENCE_PREFIX,nextNumber:2},
     update:{nextNumber:{increment:1}}
    });
    for(let skip=0;skip<1000;skip++){
     const refCode=formatPropertyReference(counter.prefix,counter.nextNumber-1);
     if(!refCode)throw new Error("REFERENCE_EXHAUSTED");
     const used=await tx.property.findUnique({where:{refCode},select:{id:true}});
     if(!used){
      const property=await tx.property.create({data:{...data,refCode,slug:propertySlug(data.title,refCode)}});
      await savePropertyLocation(tx,property.id,location);
      return property;
     }
     counter=await tx.propertySequence.update({where:{id:"main"},data:{nextNumber:{increment:1}}});
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
