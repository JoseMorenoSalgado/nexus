import {NextRequest} from "next/server";
import {requireAdmin} from "@/lib/auth";
import {prisma} from "@/lib/prisma";
import {validMutationOrigin,propertyRedirect} from "@/lib/admin-property-request";
import {validReferencePrefix} from "@/lib/property-reference";
export const runtime="nodejs";
export async function POST(req:NextRequest){
 const admin=await requireAdmin();
 if(!admin.roles.includes("admin"))return new Response("No autorizado",{status:403});
 if(!validMutationOrigin(req))return new Response("Origen no autorizado",{status:403});
 if(Number(req.headers.get("content-length")||0)>3000)return propertyRedirect("/admin/propiedades?error=datos");
 let form:FormData;
 try{form=await req.formData();}catch{return propertyRedirect("/admin/propiedades?error=datos");}
 const raw=form.get("prefix");
 if(typeof raw!=="string"||raw.length>32)return propertyRedirect("/admin/propiedades?error=datos");
 const prefix=raw.trim().toUpperCase();
 if(!validReferencePrefix(prefix))return propertyRedirect("/admin/propiedades?error=datos");
 await prisma.propertySequence.upsert({where:{tenantId:admin.tenantId},
  create:{tenantId:admin.tenantId,prefix,nextNumber:1},
  update:{prefix}
 });
 return propertyRedirect("/admin/propiedades?updated=1");
}
