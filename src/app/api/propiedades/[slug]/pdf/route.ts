import {hasDatabaseConfig} from "@/lib/server-config";
import {NextResponse,type NextRequest} from "next/server";
import {prisma} from "@/lib/prisma";
import {tenantFromHost} from "@/lib/tenant";
import {getSiteTemplate} from "@/lib/site-template-store";
import {tenantModuleEnabled} from "@/lib/tenant-modules";
import {isPreviewHost} from "@/lib/preview";
import {demoProperties,demoTenant} from "@/lib/demo";
import {buildPropertyPdf,type PropertyPdfInput} from "@/lib/property-pdf";
export const runtime="nodejs";
export async function GET(req:NextRequest,{params}:{params:Promise<{slug:string}>}){
 const {slug}=await params;
 const hostname=req.headers.get("host")||"";
 const preview=isPreviewHost(hostname);
 const mode=req.nextUrl.searchParams.get("formato")==="resumida"?"resumida":"ampliada";
 const selected=req.nextUrl.searchParams.getAll("fotos").filter(x=>x.length<=100).slice(0,5);
 let property:PropertyPdfInput|undefined;
 let tenantName=demoTenant.name,primaryColor="#CB2027";
 if(!hasDatabaseConfig()){
  if(preview||process.env.NODE_ENV!=="production"){
   const demo=demoProperties.find(x=>x.slug===slug);
   if(demo)property={tenantId:"demo",slug:demo.slug,refCode:demo.refCode,title:demo.title,
    description:demo.description,city:demo.city,neighborhood:demo.neighborhood,type:demo.type,
    operation:demo.operation,price:demo.price,bedrooms:demo.bedrooms,bathrooms:demo.bathrooms,
    areaM2:demo.areaM2,photos:[]};
  }
 }else{
  let tenant:Awaited<ReturnType<typeof tenantFromHost>>=null;
  try{tenant=await tenantFromHost(hostname);}catch(error){if(!preview)throw error;}
  if(tenant){
   if((await getSiteTemplate(tenant.tenantId)).key!=="real-estate"||!await tenantModuleEnabled(tenant.tenantId,"properties"))
    return NextResponse.json({error:"Propiedad no encontrada"},{status:404});
   const x=await prisma.property.findFirst({where:{tenantId:tenant.tenantId,slug,published:true},
    include:{photos:{orderBy:{sortOrder:"asc"},take:15}}});
   if(x){
    property={tenantId:tenant.tenantId,slug:x.slug,refCode:x.refCode,title:x.title,description:x.description,
     city:x.city,neighborhood:x.neighborhood,type:x.type,operation:x.operation,price:Number(x.price),
     bedrooms:x.bedrooms,bathrooms:x.bathrooms,areaM2:x.areaM2,
     photos:x.photos.map(photo=>({id:photo.id,url:photo.url}))};
    tenantName=tenant.tenant.name;primaryColor=tenant.tenant.primaryColor;
   }
  }else if(preview){
   const demo=demoProperties.find(x=>x.slug===slug);
   if(demo)property={tenantId:"demo",slug:demo.slug,refCode:demo.refCode,title:demo.title,
    description:demo.description,city:demo.city,neighborhood:demo.neighborhood,type:demo.type,
    operation:demo.operation,price:demo.price,bedrooms:demo.bedrooms,bathrooms:demo.bathrooms,
    areaM2:demo.areaM2,photos:[]};
  }
 }
 if(!property)return NextResponse.json({error:"Propiedad no encontrada"},{status:404});
 const publicUrl=new URL("/propiedades/"+encodeURIComponent(property.slug),req.nextUrl.origin).toString();
 const {bytes}=await buildPropertyPdf(property,{mode,photoIds:selected,tenantName,primaryColor,publicUrl});
 const filename="nexus-"+property.refCode.replace(/[^A-Za-z0-9-]/g,"")+
  (mode==="resumida"?"-resumida":"-ampliada")+".pdf";
 return new NextResponse(bytes,{headers:{
  "Content-Type":"application/pdf",
  "Content-Disposition":(req.nextUrl.searchParams.get("vista")==="1"?"inline":"attachment")+
   '; filename="'+filename+'"',
  "Cache-Control":"private, no-store",
  "X-Content-Type-Options":"nosniff"
 }});
}
