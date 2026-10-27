import {NextRequest,NextResponse} from "next/server";
import {tenantFromHost} from "@/lib/tenant";
import {prisma} from "@/lib/prisma";
import {getSiteTemplate} from "@/lib/site-template-store";
import {tenantModuleEnabled} from "@/lib/tenant-modules";
import {pdfDownloadResponse,readCustomPdf} from "@/lib/property-document";

export const runtime="nodejs";
export const dynamic="force-dynamic";

export async function GET(req:NextRequest,{params}:{params:Promise<{slug:string}>}){
 const {slug}=await params;
 const tenant=await tenantFromHost(req.headers.get("host")||"");
 if(!tenant)return new NextResponse(null,{status:404});
 if((await getSiteTemplate(tenant.tenantId)).key!=="real-estate"||!await tenantModuleEnabled(tenant.tenantId,"properties"))return new NextResponse(null,{status:404});
 const property=await prisma.property.findFirst({
  where:{tenantId:tenant.tenantId,slug,published:true},
  select:{id:true,refCode:true}
 });
 if(!property)return new NextResponse(null,{status:404});
 const pdf=await readCustomPdf(tenant.tenantId,property.id);
 if(!pdf)return new NextResponse(null,{status:404});
 return pdfDownloadResponse(pdf,"ficha-"+property.refCode+"-personalizada.pdf");
}
