"use client";

/** Keep banner uploads below typical reverse-proxy request limits (e.g. 1 MiB).
 * The server still validates the final image and creates a high-quality WebP.
 * Nothing is sent to external image conversion services.
 */
const MAX_REQUEST_IMAGE_BYTES=700*1024;
const MAX_STEPS=14;
type Kind="hero"|"logo"|"about-photo"|"hero-propiedades"|"hero-nosotros"|"hero-servicios"|"hero-contacto"|"hero-asesoria-empresarial";
function canvasBlob(canvas:HTMLCanvasElement,quality:number):Promise<Blob>{
 return new Promise((resolve,reject)=>{
  canvas.toBlob(blob=>blob?resolve(blob):reject(new Error("El navegador no pudo optimizar esta fotografía.")),"image/webp",quality);
 });
}
export async function prepareSiteImage(file:File,kind:Kind):Promise<File>{
 if(file.size<=MAX_REQUEST_IMAGE_BYTES)return file;
 if(typeof createImageBitmap!=="function")throw new Error("Tu navegador no permite optimizar esta imagen. Convierte la fotografía a WebP antes de subirla.");
 let image:ImageBitmap;
 try{image=await createImageBitmap(file);}catch{
  throw new Error("No se pudo procesar la fotografía. Utiliza JPG, PNG o WebP.");
 }
 try{
  const canvas=document.createElement("canvas");
  const context=canvas.getContext("2d");
  if(!context)throw new Error("No fue posible preparar la fotografía en el navegador.");
  const longest=kind==="logo"?960:2560;
  const base=Math.min(1,longest/Math.max(image.width,image.height));
  for(let attempt=0;attempt<MAX_STEPS;attempt++){
   const scale=base*Math.pow(0.84,Math.floor(attempt/4));
   canvas.width=Math.max(1,Math.round(image.width*scale));
   canvas.height=Math.max(1,Math.round(image.height*scale));
   context.clearRect(0,0,canvas.width,canvas.height);
   context.imageSmoothingEnabled=true;
   context.imageSmoothingQuality="high";
   context.drawImage(image,0,0,canvas.width,canvas.height);
   const quality=[0.91,0.82,0.73,0.63][attempt%4];
   const data=await canvasBlob(canvas,quality);
   if(data.type==="image/webp"&&data.size<=MAX_REQUEST_IMAGE_BYTES){
    return new File([data],file.name.replace(/\.[^.]*$/,"")+".webp",{type:"image/webp",lastModified:file.lastModified});
   }
  }
  throw new Error("La imagen no pudo reducirse al tamaño admitido. Prueba con una fotografía de menor resolución.");
 }finally{image.close();}
}
