import {readFile} from "node:fs/promises";
import sharp from "sharp";
import QRCode from "qrcode";
import {PDFDocument,PDFPage,PDFFont,StandardFonts,rgb} from "pdf-lib";
import {isPhotoId,mediaFilePath} from "@/lib/property-media";

export type PropertyPdfInput={
 tenantId:string;slug:string;refCode:string;title:string;description:string;
 city:string;neighborhood:string|null;type:string;operation:string;
 price:number;bedrooms:number|null;bathrooms:number|null;areaM2:number|null;
 photos:Array<{id:string;url:string}>;
};
type Color={r:number;g:number;b:number};
const PAGE_W=595.28,PAGE_H=841.89;
const paper=rgb(1,1,1),ink=rgb(.12,.16,.22),muted=rgb(.37,.41,.46),light=rgb(.95,.96,.97);
const safe=(value:string)=>value.replace(/[\u2018\u2019]/g,"'").replace(/[\u201c\u201d]/g,'"').replace(/[\u2013\u2014]/g,"-").replace(/[^\x20-\xFF]/g," ").replace(/\s+/g," ").trim();
function brand(raw:string){
 const hex=/^#[0-9a-f]{6}$/i.test(raw)?raw:"#CB2027";
 return rgb(Number.parseInt(hex.slice(1,3),16)/255,Number.parseInt(hex.slice(3,5),16)/255,Number.parseInt(hex.slice(5,7),16)/255);
}
function wrapped(text:string,font:PDFFont,size:number,width:number){
 const words=safe(text).split(/\s+/).filter(Boolean),lines:string[]=[];
 let line="";
 for(const word of words){
  const proposal=line?line+" "+word:word;
  if(font.widthOfTextAtSize(proposal,size)<=width){line=proposal;continue;}
  if(line){lines.push(line);line="";}
  if(font.widthOfTextAtSize(word,size)<=width){line=word;continue;}
  let part="";
  for(const char of word){
   if(font.widthOfTextAtSize(part+char,size)>width&&part){lines.push(part);part="";}
   part+=char;
  }
  line=part;
 }
 if(line)lines.push(line);
 return lines;
}
function drawParagraph(page:PDFPage,lines:string[],x:number,y:number,font:PDFFont,size:number,limit:number){
 lines.slice(0,limit).forEach((line,i)=>page.drawText(line,{x,y:y-i*(size+4),size,font,color:muted}));
}
function header(page:PDFPage,title:string,code:string,color:ReturnType<typeof rgb>,bold:PDFFont,regular:PDFFont,pageNumber:number){
 page.drawRectangle({x:0,y:750,width:PAGE_W,height:92,color:ink});
 const brandLines=wrapped(title,bold,19,505);
 page.drawText(brandLines[0]||"NEXUS REAL ESTATE",{x:40,y:794,size:19,font:bold,color:paper});
 page.drawText("FICHA TÉCNICA INMOBILIARIA",{x:40,y:772,size:10,font:regular,color:paper});
 page.drawRectangle({x:0,y:744,width:PAGE_W,height:6,color});
 page.drawText("REFERENCIA  "+safe(code),{x:40,y:723,size:10,font:bold,color});
 page.drawText("Página "+pageNumber,{x:506,y:723,size:9,font:regular,color:muted});
}
function footer(page:PDFPage,regular:PDFFont,label:string){
 page.drawRectangle({x:40,y:70,width:515,height:1,color:light});
 page.drawText(safe(label).slice(0,66)+" · Documento informativo",{x:40,y:52,size:8,font:regular,color:muted});
}
async function drawPhoto(pdf:PDFDocument,page:PDFPage,tenantId:string,photo:{id:string;url:string}|undefined,rect:{x:number;y:number;width:number;height:number},regular:PDFFont){
 page.drawRectangle({...rect,color:light});
 if(!photo||!isPhotoId(photo.id)||photo.url!=="/api/media/"+photo.id){
  page.drawText("Imagen disponible en la galería web",{x:rect.x+12,y:rect.y+rect.height/2,size:9,font:regular,color:muted});return false;
 }
 try{
  const input=await readFile(mediaFilePath(tenantId,photo.id));
  const converted=await sharp(input,{limitInputPixels:40_000_000}).rotate().resize({width:1600,height:1200,fit:"inside",withoutEnlargement:true}).jpeg({quality:79}).toBuffer();
  const image=await pdf.embedJpg(converted);
  const scale=Math.min(rect.width/image.width,rect.height/image.height);
  const width=image.width*scale,height=image.height*scale;
  page.drawImage(image,{x:rect.x+(rect.width-width)/2,y:rect.y+(rect.height-height)/2,width,height});
  return true;
 }catch{
  page.drawText("Fotografía no disponible",{x:rect.x+12,y:rect.y+rect.height/2,size:9,font:regular,color:muted});return false;
 }
}
export async function buildPropertyPdf(property:PropertyPdfInput,options:{
 mode:"resumida"|"ampliada";photoIds:string[];tenantName:string;primaryColor:string;publicUrl:string;
}){
 const pdf=await PDFDocument.create();
 pdf.setTitle(safe(property.title)+" - "+safe(property.refCode));
 pdf.setAuthor(safe(options.tenantName));
 const regular=await pdf.embedFont(StandardFonts.Helvetica);
 const bold=await pdf.embedFont(StandardFonts.HelveticaBold);
 const accent=brand(options.primaryColor);
 const images=property.photos.filter(p=>isPhotoId(p.id)&&p.url==="/api/media/"+p.id);
 const selected=options.photoIds.length?
  [...new Set(options.photoIds)].map(id=>images.find(p=>p.id===id)).filter((p):p is {id:string;url:string}=>Boolean(p)).slice(0,5):
  images.slice(0,5);
 const photos=selected.length?selected:images.slice(0,5);
 const page=pdf.addPage([PAGE_W,PAGE_H]);
 header(page,options.tenantName,property.refCode,accent,bold,regular,1);
 const titleLines=wrapped(property.title,bold,17,505);
 drawParagraph(page,titleLines.slice(0,2),40,692,bold,17,2);
 const place=safe([property.neighborhood,property.city].filter(Boolean).join(", "));
 page.drawText(wrapped(place,regular,10,510)[0]||"Ubicación por confirmar",{x:40,y:642,size:10,font:regular,color:muted});
 page.drawRectangle({x:40,y:566,width:515,height:60,color:light});
 const price=new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",maximumFractionDigits:2}).format(property.price);
 page.drawText(price,{x:54,y:598,font:bold,size:19,color:accent});
 const stats=property.type+" · "+(property.operation==="alquiler"?"Alquiler":"Venta")+" · "+
  (property.bedrooms||0)+" hab. · "+(property.bathrooms||0)+" baños · "+(property.areaM2||0)+" m²";
 page.drawText(wrapped(stats,regular,9,490)[0]||"",{x:54,y:580,font:regular,size:9,color:ink});
 await drawPhoto(pdf,page,property.tenantId,photos[0],{x:40,y:284,width:515,height:267},regular);
 page.drawText("DESCRIPCIÓN",{x:40,y:262,size:11,font:bold,color:ink});
 const lines=wrapped(property.description,regular,10,515);
 const page1Lines=lines.slice(0,9);
 drawParagraph(page,page1Lines,40,241,regular,10,9);
 footer(page,regular,options.tenantName);
 let remaining=lines.slice(page1Lines.length);
 const extraPhotos=options.mode==="ampliada"?photos.slice(1,5):[];
 if(options.mode==="ampliada"&&(extraPhotos.length||remaining.length)){
  const page2=pdf.addPage([PAGE_W,PAGE_H]);
  header(page2,options.tenantName,property.refCode,accent,bold,regular,2);
  if(extraPhotos.length){
   page2.drawText("GALERÍA DESTACADA",{x:40,y:704,font:bold,size:11,color:ink});
   for(let i=0;i<extraPhotos.length;i++){
    const col=i%2,row=Math.floor(i/2);
    await drawPhoto(pdf,page2,property.tenantId,extraPhotos[i],{
     x:40+col*265,y:500-row*187,width:250,height:178
    },regular);
   }
  }
  const textY=extraPhotos.length>2?286:extraPhotos.length?475:687;
  if(remaining.length){
   page2.drawText("MÁS INFORMACIÓN",{x:40,y:textY,font:bold,size:11,color:ink});
   const lineCount=Math.max(0,Math.floor((textY-140)/14));
   drawParagraph(page2,remaining,40,textY-22,regular,10,lineCount);
   remaining=remaining.slice(lineCount);
  }
  footer(page2,regular,options.tenantName);
 }
 // The full description and all non-selected photographs remain on the public property page.
 const shown=options.mode==="resumida"?Math.min(1,photos.length):Math.min(photos.length,5);
 const hasExtraImages=property.photos.length>shown;
 if(hasExtraImages||remaining.length||titleLines.length>2){
  const png=await QRCode.toBuffer(options.publicUrl,{type:"png",width:180,margin:1,errorCorrectionLevel:"M"});
  const qr=await pdf.embedPng(png);
  const last=pdf.getPages()[pdf.getPageCount()-1];
  last.drawRectangle({x:461,y:18,width:94,height:108,color:paper});
  last.drawText("VER FICHA WEB",{x:468,y:110,font:bold,size:8,color:accent});
  last.drawImage(qr,{x:472,y:28,width:76,height:76});
 }
 return {bytes:new Uint8Array(await pdf.save()),pageCount:pdf.getPageCount()};
}
