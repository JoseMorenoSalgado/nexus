import "server-only";
import {readFile,stat} from "node:fs/promises";
import {join} from "node:path";
import {PDFDocument,PDFName} from "pdf-lib";
import {configDir} from "@/lib/server-config";

export const MAX_CUSTOM_PDF_BYTES=10*1024*1024;
export const MAX_CUSTOM_PDF_PAGES=60;
const tenantKey=/^[a-z0-9]{10,64}$/;
const propertyKey=/^[a-z0-9]{10,64}$/;

export function customPdfPath(tenantId:string,propertyId:string){
 if(!tenantKey.test(tenantId)||!propertyKey.test(propertyId))throw new Error("Identificador de documento inválido");
 return join(configDir(),"property-documents",tenantId,propertyId+".pdf");
}

export async function hasCustomPdf(tenantId:string,propertyId:string){
 try{return (await stat(customPdfPath(tenantId,propertyId))).isFile();}
 catch{return false;}
}

export async function readCustomPdf(tenantId:string,propertyId:string){
 try{return await readFile(customPdfPath(tenantId,propertyId));}
 catch{return null;}
}

/**
 * Reconstruct a fresh PDF from its pages, without carrying over the source
 * catalog, JavaScript name trees, attachments, forms or page annotations.
 * Do not embed or fetch external links while preparing a brochure.
 */
export async function sanitizePropertyPdf(raw:Uint8Array){
 if(raw.length<100||raw.length>MAX_CUSTOM_PDF_BYTES)throw new Error("SIZE");
 const magic=Buffer.from(raw.subarray(0,8)).toString("latin1");
 if(!magic.startsWith("%PDF-"))throw new Error("FORMAT");
 const trailer=Buffer.from(raw.subarray(Math.max(0,raw.length-2048))).toString("latin1");
 if(!trailer.includes("%%EOF"))throw new Error("FORMAT");
 let original:PDFDocument;
 try{original=await PDFDocument.load(raw,{updateMetadata:false});}
 catch{throw new Error("INVALID");}
 const n=original.getPageCount();
 if(n<1||n>MAX_CUSTOM_PDF_PAGES)throw new Error("PAGES");
 // Discard interactive structures before copying to avoid importing their objects.
 for(const page of original.getPages()){
  page.node.delete(PDFName.of("Annots"));
  page.node.delete(PDFName.of("AA"));
 }
 const clean=await PDFDocument.create();
 const pages=await clean.copyPages(original,original.getPageIndices());
 for(const page of pages){
  page.node.delete(PDFName.of("Annots"));
  page.node.delete(PDFName.of("AA"));
  clean.addPage(page);
 }
 clean.setTitle("Ficha inmobiliaria personalizada");
 clean.setProducer("WebAppECloud");
 const saved=await clean.save({useObjectStreams:true});
 if(saved.byteLength>MAX_CUSTOM_PDF_BYTES)throw new Error("SIZE");
 return Buffer.from(saved);
}

export function pdfDownloadResponse(bytes:Uint8Array,filename:string){
 const safeFilename=filename.replace(/[^A-Za-z0-9._-]/g,"").slice(0,110)||"ficha.pdf";
 return new Response(new Uint8Array(bytes),{
  status:200,
  headers:{
   "Content-Type":"application/pdf",
   "Content-Disposition":'attachment; filename="'+safeFilename+'"',
   "Cache-Control":"private, no-store",
   "Content-Security-Policy":"sandbox",
   "X-Content-Type-Options":"nosniff",
   "Cross-Origin-Resource-Policy":"same-origin"
  }
 });
}
