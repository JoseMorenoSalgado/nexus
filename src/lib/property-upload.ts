import "server-only";
import {createHash} from "node:crypto";
import {appendFile,mkdir,readFile,rm,stat,writeFile} from "node:fs/promises";
import {join} from "node:path";
import {NextRequest,NextResponse} from "next/server";
import {readJsonObjectLimited,RequestPayloadError} from "@/lib/limited-json";
import {PROPERTY_FILE_MAX_BYTES,PROPERTY_UPLOAD_CHUNK_BYTES} from "@/lib/property-upload-limits";
import {configDir} from "@/lib/server-config";

const state=globalThis as typeof globalThis&{nexusPropertyUploadLocks?:Set<string>};
const active=state.nexusPropertyUploadLocks??=new Set<string>();
const fail=(error:string,status:number)=>NextResponse.json({error},{status,headers:{"Cache-Control":"no-store"}});

export async function readBase64Upload(req:NextRequest,maxBytes:number){
 const {image}=await readJsonObjectLimited(req,4*Math.ceil(maxBytes/3)+64);
 if(typeof image!=="string"||image.length%4!==0||!/^[A-Za-z0-9+/]+={0,2}$/.test(image)){
  throw new RequestPayloadError(400,"No se pudo leer el archivo enviado.");
 }
 return Buffer.from(image,"base64");
}

/** Receive one sequential chunk after the route has authorized access to the property. */
export async function receivePropertyUpload(
 req:NextRequest,
 owner:{tenantId:string;userId:string;propertyId:string;kind:"photo"|"document"},
 save:(path:string)=>Promise<Response>
){
 const query=req.nextUrl.searchParams;
 const id=query.get("upload");
 const offsetText=query.get("offset")||"";
 const sizeText=query.get("size")||"";
 const offset=Number(offsetText),size=Number(sizeText);
 if(!id||!/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(id)||!/^\d{1,9}$/.test(offsetText)||!/^\d{1,9}$/.test(sizeText)||
    size<100||offset>=size||offset%PROPERTY_UPLOAD_CHUNK_BYTES!==0){
  return fail("Subida inválida. Selecciona el archivo nuevamente.",400);
 }
 if(size>PROPERTY_FILE_MAX_BYTES)return fail("El archivo supera los 300 MB.",413);
 // A single staging slot per account prevents accumulating partial files on retries.
 const key=createHash("sha256").update(JSON.stringify([owner.tenantId,owner.userId])).digest("hex");
 if(active.has(key))return fail("Hay otro archivo en proceso en esta sesión.",409);
 active.add(key);
 const directory=join(configDir(),"property-uploads",key);
 const data=join(directory,"file.part"),meta=join(directory,"upload.json");
 const identity=JSON.stringify({id,size,propertyId:owner.propertyId,kind:owner.kind});
 let processing=false,removeStaging=false;
 try{
  const chunk=await readBase64Upload(req,PROPERTY_UPLOAD_CHUNK_BYTES);
  if(chunk.length!==Math.min(PROPERTY_UPLOAD_CHUNK_BYTES,size-offset))return fail("La parte recibida tiene un tamaño incorrecto.",400);
  const last=offset+chunk.length===size;
  if(last&&active.has("processing"))return fail("El servidor está procesando otro archivo. Inténtalo de nuevo.",409);
  if(last){active.add("processing");processing=true;}
  if(offset===0){
   await mkdir(directory,{recursive:true,mode:0o700});
   await writeFile(data,chunk,{mode:0o600});
   await writeFile(meta,identity,{mode:0o600});
  }else{
   const previous=await readFile(meta,"utf8").catch(()=>null);
   const current=await stat(data).catch(()=>null);
   if(previous!==identity||current?.size!==offset)return fail("La subida se interrumpió. Selecciona el archivo nuevamente.",409);
   await appendFile(data,chunk);
  }
  if(!last)return NextResponse.json({ok:true},{status:202,headers:{"Cache-Control":"no-store"}});
  removeStaging=true;
  return await save(data);
 }catch(error){
  if(error instanceof RequestPayloadError)return fail(error.message,error.status);
  console.error("[property-upload]",error instanceof Error?error.name:"unknown");
  return fail("No se pudo preparar el archivo para guardarlo.",500);
 }finally{
  try{
   if(removeStaging)await rm(directory,{recursive:true,force:true});
  }catch(error){
   console.error("[property-upload] cleanup",error instanceof Error?error.name:"unknown");
  }finally{
   if(processing)active.delete("processing");
   active.delete(key);
  }
 }
}
