import {hasDatabaseConfig} from "@/lib/server-config";
import {readFile} from "node:fs/promises";
import sharp from "sharp";
import {mediaFilePath,isPhotoId} from "@/lib/property-media";
import {NextResponse,type NextRequest} from "next/server";
import {PDFDocument,StandardFonts,rgb} from "pdf-lib";
import {prisma} from "@/lib/prisma";
import {tenantFromHost} from "@/lib/tenant";
import {getSiteTemplate} from "@/lib/site-template-store";
import {tenantModuleEnabled} from "@/lib/tenant-modules";
import {isPreviewHost} from "@/lib/preview";
import {demoProperties,formatPrice,type PublicProperty} from "@/lib/demo";
export async function GET(req:NextRequest,{params}:{params:Promise<{slug:string}>}){
 const {slug}=await params;
 let p:PublicProperty|undefined;
 let demoPdf=false;
 let storedPhotos:Array<{id:string;tenantId:string}>=[];
 const hostname=req.headers.get("host")||"";
 const preview=isPreviewHost(hostname);
 if(!hasDatabaseConfig()){
   if(preview||process.env.NODE_ENV!=="production"){
     p=demoProperties.find(x=>x.slug===slug);
     demoPdf=Boolean(p);
   }
 }else{
   let tenant:Awaited<ReturnType<typeof tenantFromHost>>=null;
   try{tenant=await tenantFromHost(hostname);}catch(error){if(!preview)throw error;}
   if(tenant){
     if((await getSiteTemplate(tenant.tenantId)).key!=="real-estate"||!await tenantModuleEnabled(tenant.tenantId,"properties"))return NextResponse.json({error:"Propiedad no encontrada"},{status:404});
     const x=await prisma.property.findFirst({where:{tenantId:tenant.tenantId,slug,published:true},include:{photos:{orderBy:{sortOrder:"asc"},take:8}}});
     if(x){
      p={id:x.id,slug:x.slug,refCode:x.refCode,title:x.title,description:x.description,city:x.city,neighborhood:x.neighborhood||"",type:x.type,operation:x.operation==="alquiler"?"alquiler":"venta",price:Number(x.price),bedrooms:x.bedrooms||0,bathrooms:x.bathrooms||0,areaM2:x.areaM2||0,image:x.photos[0]?.url||"",photos:x.photos.map(p=>p.url)};
      storedPhotos=x.photos.filter(photo=>isPhotoId(photo.id)&&photo.url==="/api/media/"+photo.id).map(photo=>({id:photo.id,tenantId:tenant.tenantId}));
     }
   }else if(preview){
     p=demoProperties.find(x=>x.slug===slug);
     demoPdf=Boolean(p);
   }
 }
 if(!p)return NextResponse.json({error:"Propiedad no encontrada"},{status:404});
 const pdf=await PDFDocument.create(),page=pdf.addPage([595,842]),font=await pdf.embedFont(StandardFonts.Helvetica),bold=await pdf.embedFont(StandardFonts.HelveticaBold);
 const clean=(v:string)=>v.normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^\x20-\x7E]/g," ");
 const dark=rgb(.16,.17,.19),red=rgb(.79,.11,.15),gray=rgb(.4,.42,.44);
 page.drawRectangle({x:0,y:746,width:595,height:96,color:dark});
 page.drawText("NEXUS REAL ESTATE",{x:42,y:788,font:bold,size:21,color:rgb(1,1,1)});
 page.drawText("PENSANDO EN TU FUTURO",{x:42,y:770,font,size:10,color:rgb(1,1,1)});
 page.drawText("FICHA TECNICA",{x:42,y:709,font:bold,size:13,color:red});
 page.drawText(clean(p.title).slice(0,48),{x:42,y:666,font:bold,size:18,color:dark});
 page.drawText("Referencia: "+clean(p.refCode),{x:42,y:635,font:bold,size:11,color:gray});
 page.drawText(clean(p.neighborhood+", "+p.city).slice(0,80),{x:42,y:614,font,size:11,color:gray});
 page.drawRectangle({x:42,y:518,width:510,height:70,color:rgb(.96,.96,.96)});
 page.drawText(clean(formatPrice(p)),{x:58,y:558,font:bold,size:19,color:red});
 page.drawText(`${p.bedrooms} habitaciones     ${p.bathrooms} banos     ${p.areaM2} m2`,{x:58,y:535,font,size:11,color:dark});
 page.drawText("DESCRIPCION",{x:42,y:477,font:bold,size:12,color:dark});
 const desc=clean(p.description);const words=desc.split(" ");let line="",lines:string[]=[];
 for(const w of words){if((line+" "+w).length>85){lines.push(line);line=w}else line+=(line?" ":"")+w;}if(line)lines.push(line);
 lines.slice(0,13).forEach((v,i)=>page.drawText(v,{x:42,y:450-i*18,font,size:10,color:gray}));
 // Only photographs stored for this tenant are embedded. External image URLs are never fetched.
 for(let i=0;i<storedPhotos.length;i+=2){
  const batch=storedPhotos.slice(i,i+2);
  const picturePage=pdf.addPage([595,842]);
  picturePage.drawRectangle({x:0,y:754,width:595,height:88,color:dark});
  picturePage.drawText("NEXUS REAL ESTATE",{x:42,y:793,font:bold,size:17,color:rgb(1,1,1)});
  picturePage.drawText("FOTOGRAFIAS · "+clean(p.refCode),{x:42,y:768,font,size:10,color:rgb(1,1,1)});
  for(let k=0;k<batch.length;k++){
   try{
    const original=await readFile(mediaFilePath(batch[k].tenantId,batch[k].id));
    const converted=await sharp(original,{limitInputPixels:40_000_000}).jpeg({quality:83}).toBuffer();
    const image=await pdf.embedJpg(converted);
    const maxWidth=510,maxHeight=300,scale=Math.min(maxWidth/image.width,maxHeight/image.height);
    const width=image.width*scale,height=image.height*scale;
    const top=k===0?735:400;
    const y=top-height;
    picturePage.drawImage(image,{x:42+(maxWidth-width)/2,y,width,height});
   }catch{
    picturePage.drawText("Fotografia no disponible",{x:42,y:k===0?600:270,font,size:12,color:gray});
   }
  }
 }
 if(demoPdf)page.drawText("MUESTRA - DATOS ILUSTRATIVOS",{x:42,y:113,font:bold,size:10,color:red});
 page.drawText("Nexus Real Estate · Documento informativo",{x:42,y:65,font,size:9,color:gray});
 return new NextResponse(new Uint8Array(await pdf.save()),{headers:{"Content-Type":"application/pdf","Content-Disposition":`attachment; filename="nexus-${p.refCode}.pdf"`,"Cache-Control":"private, no-store"}});
}
