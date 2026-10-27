import "server-only";
import {PDFDocument,StandardFonts,rgb,type PDFFont,type PDFPage} from "pdf-lib";

type Column={title:string;width:number};
type Metric={label:string;value:string};
export type CommercialPdfInput={
 tenantName:string;title:string;subtitle:string;period:string;
 metrics:Metric[];columns:Column[];rows:string[][];
 note:string;
};
const A4:[number,number]=[595.28,841.89],margin=39,contentWidth=A4[0]-margin*2;
const ink=rgb(.13,.20,.28),muted=rgb(.39,.46,.54),red=rgb(.70,.12,.21);
const neutral=rgb(.93,.95,.97),line=rgb(.86,.89,.92),white=rgb(1,1,1);
function printable(text:string){return text.normalize("NFC")
 .replace(/[\u2010-\u2015]/g,"-").replace(/[\u2018\u2019]/g,"'")
 .replace(/[\u201c\u201d]/g,'"').replace(/[^\x20-\x7e\xA0-\xFF]/g," ")
 .replace(/\s+/g," ").trim();}
function fit(font:PDFFont,raw:string,width:number,size:number){
 const value=printable(raw);
 if(font.widthOfTextAtSize(value,size)<=width)return value;
 let end=value.length;
 while(end>0&&font.widthOfTextAtSize(value.slice(0,end)+"...",size)>width)end--;
 return end?value.slice(0,end)+"...":"";
}
/** All content comes from already scoped queries; no remote URLs or font assets loaded. */
export async function renderCommercialPdf(input:CommercialPdfInput):Promise<Uint8Array>{
 const pdf=await PDFDocument.create();
 const regular=await pdf.embedFont(StandardFonts.Helvetica);
 const bold=await pdf.embedFont(StandardFonts.HelveticaBold);
 const sum=input.columns.reduce((a,c)=>a+c.width,0);
 if(Math.abs(sum-contentWidth)>1)throw Error("PDF_COLUMNS_WIDTH_MISMATCH");
 let page!:PDFPage,y!:number,pageNumber=0;
 const newPage=()=>{
  page=pdf.addPage(A4);pageNumber++;
  page.drawRectangle({x:0,y:A4[1]-12,width:A4[0],height:12,color:red});
  page.drawText(fit(bold,input.tenantName,410,12),{x:margin,y:A4[1]-44,size:12,font:bold,color:ink});
  page.drawText("CONFIDENCIAL",{x:A4[0]-139,y:A4[1]-44,size:8,font:bold,color:red});
  page.drawLine({start:{x:margin,y:A4[1]-55},end:{x:A4[0]-margin,y:A4[1]-55},thickness:1,color:line});
  y=A4[1]-84;
 };
 newPage();
 page.drawText(fit(bold,input.title,contentWidth,19),{x:margin,y,size:19,font:bold,color:ink});y-=22;
 page.drawText(fit(regular,input.subtitle,contentWidth,9),{x:margin,y,size:9,font:regular,color:muted});y-=17;
 page.drawText(fit(regular,input.period,contentWidth,8.5),{x:margin,y,size:8.5,font:regular,color:muted});y-=24;
 const cards=input.metrics.slice(0,4),cardGap=8,cardWidth=(contentWidth-cardGap*(cards.length-1))/Math.max(1,cards.length);
 cards.forEach((metric,i)=>{
  const x=margin+i*(cardWidth+cardGap);
  page.drawRectangle({x,y:y-47,width:cardWidth,height:54,color:neutral,borderColor:line,borderWidth:.5});
  page.drawText(fit(regular,metric.label,cardWidth-14,8),{x:x+8,y:y-11,font:regular,size:8,color:muted});
  page.drawText(fit(bold,metric.value,cardWidth-14,12),{x:x+8,y:y-31,font:bold,size:12,color:ink});
 });y-=78;
 const tableHeader=()=>{
  page.drawRectangle({x:margin,y:y-24,width:contentWidth,height:27,color:ink});
  let x=margin;
  for(const column of input.columns){
   page.drawText(fit(bold,column.title,column.width-10,7.8),{x:x+5,y:y-15,font:bold,size:7.8,color:white});
   x+=column.width;
  }
  y-=31;
 };
 tableHeader();
 for(let i=0;i<input.rows.length;i++){
  if(y<91){newPage();tableHeader();}
  if(i%2===0)page.drawRectangle({x:margin,y:y-23,width:contentWidth,height:26,color:rgb(.974,.980,.986)});
  let x=margin;
  input.rows[i].forEach((cell,j)=>{
   const width=input.columns[j]?.width||0;
   if(width>0)page.drawText(fit(j===0?bold:regular,cell,width-10,8),{x:x+5,y:y-13,size:8,font:j===0?bold:regular,color:ink});
   x+=width;
  });
  y-=27;
 }
 if(!input.rows.length)page.drawText("Sin registros para los filtros seleccionados.",{x:margin,y:y-14,font:regular,size:10,color:muted});
 const pages=pdf.getPages();
 pages.forEach((p,index)=>{
  p.drawLine({start:{x:margin,y:61},end:{x:A4[0]-margin,y:61},thickness:.8,color:line});
  p.drawText(fit(regular,input.note,contentWidth-88,7),{x:margin,y:47,font:regular,size:7,color:muted});
  p.drawText((index+1)+" / "+pages.length,{x:A4[0]-margin-35,y:47,font:regular,size:8,color:muted});
 });
 return pdf.save();
}
