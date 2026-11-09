"use client";

import {readAdminJson} from "@/lib/admin-json-response";
import {PROPERTY_UPLOAD_CHUNK_BYTES} from "@/lib/property-upload-limits";

function readBase64(part:Blob):Promise<string>{
 return new Promise((resolve,reject)=>{
  const reader=new FileReader();
  const fail=()=>reject(new Error("No se pudo leer el archivo."));
  reader.onerror=reader.onabort=fail;
  reader.onload=()=>{
   if(typeof reader.result!=="string"||!reader.result.includes(","))return fail();
   resolve(reader.result.slice(reader.result.indexOf(",")+1));
  };
  reader.readAsDataURL(part);
 });
}

export async function uploadPropertyFile(endpoint:string,file:File,onProgress:(progress:number)=>void){
 const upload=crypto.randomUUID();
 for(let offset=0;offset<file.size;offset+=PROPERTY_UPLOAD_CHUNK_BYTES){
  const part=file.slice(offset,offset+PROPERTY_UPLOAD_CHUNK_BYTES);
  const query=new URLSearchParams({upload,offset:String(offset),size:String(file.size)});
  const body=JSON.stringify({image:await readBase64(part)});
  const response=await fetch(endpoint+"?"+query,{method:"POST",headers:{"Content-Type":"application/json"},body,credentials:"same-origin",cache:"no-store"});
  await readAdminJson(response,"No se pudo subir "+file.name);
  if((offset+part.size<file.size)!==(response.status===202))throw new Error("El servidor no confirmó el archivo completo.");
  onProgress(Math.round((offset+part.size)*100/file.size));
 }
}
