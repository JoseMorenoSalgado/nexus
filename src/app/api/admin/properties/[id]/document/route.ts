import {tenantModuleEnabled} from "@/lib/tenant-modules";
import {randomUUID} from "node:crypto";
import {mkdir,rename,unlink,writeFile} from "node:fs/promises";
import {dirname} from "node:path";
import {NextRequest,NextResponse} from "next/server";
import {prisma} from "@/lib/prisma";
import {customPdfPath,MAX_CUSTOM_PDF_BYTES,pdfDownloadResponse,readCustomPdf,sanitizePropertyPdf} from "@/lib/property-document";
import {propertyEditor,validMutationOrigin} from "@/lib/admin-property-request";
import {propertyWhere} from "@/lib/agent-scope";

export const runtime="nodejs";
export const dynamic="force-dynamic";
const fail=(message:string,status:number)=>NextResponse.json({error:message},{status,headers:{"Cache-Control":"no-store"}});

async function identify(id:string){
 const admin=await propertyEditor();
 if(!await tenantModuleEnabled(admin.tenantId,"properties"))return {admin,property:null,disabled:true};
 const property=await prisma.property.findFirst({where:{id,...propertyWhere(admin)},select:{id:true,refCode:true}});
 return {admin,property};
}

export async function GET(_req:NextRequest,{params}:{params:Promise<{id:string}>}){
 const {id}=await params;
 const resolved=await identify(id);
 if("disabled" in resolved)return fail("Módulo desactivado",403);
 const {admin,property}=resolved;
 if(!property)return fail("Documento no encontrado.",404);
 const bytes=await readCustomPdf(admin.tenantId,property.id);
 if(!bytes)return fail("Documento no encontrado.",404);
 return pdfDownloadResponse(bytes,"ficha-"+property.refCode+"-personalizada.pdf");
}

export async function POST(req:NextRequest,{params}:{params:Promise<{id:string}>}){
 const {id}=await params;
 const resolved=await identify(id);
 if("disabled" in resolved)return fail("Módulo desactivado",403);
 const {admin,property}=resolved;
 if(!admin.canEdit)return fail("No tienes permisos para modificar esta propiedad.",403);
 if(!property)return fail("Inmueble no encontrado.",404);
 if(!validMutationOrigin(req))return fail("Origen de solicitud no autorizado.",403);
 const length=Number(req.headers.get("content-length")||0);
 if(!Number.isSafeInteger(length)||length<=0||length>MAX_CUSTOM_PDF_BYTES+1024*1024)return fail("El archivo supera el límite de 10 MB.",413);
 let file:FormDataEntryValue|null;
 try{file=(await req.formData()).get("document");}
 catch{return fail("No se pudo leer el documento.",400);}
 if(!(file instanceof File)||!file.name.toLowerCase().endsWith(".pdf"))return fail("Selecciona un archivo PDF.",415);
 if(file.size<100||file.size>MAX_CUSTOM_PDF_BYTES)return fail("El PDF debe pesar como máximo 10 MB.",413);
 if(!["application/pdf","application/octet-stream",""].includes(file.type))return fail("Solo se permiten archivos PDF.",415);
 let safe:Buffer;
 try{safe=await sanitizePropertyPdf(new Uint8Array(await file.arrayBuffer()));}
 catch(error){
  const code=error instanceof Error?error.message:"INVALID";
  if(code==="SIZE")return fail("El PDF supera los 10 MB.",413);
  if(code==="PAGES")return fail("Máximo 60 páginas por PDF.",422);
  return fail("El PDF está dañado, protegido o contiene contenido no compatible.",422);
 }
 const target=customPdfPath(admin.tenantId,property.id);
 const temp=target+"."+randomUUID()+".tmp";
 try{
  await mkdir(dirname(target),{recursive:true,mode:0o700});
  await writeFile(temp,safe,{flag:"wx",mode:0o600});
  // Do not leave an orphaned document for a property removed during processing.
  const stillExists=await prisma.property.findFirst({where:{id:property.id,...propertyWhere(admin)},select:{id:true}});
  if(!stillExists)return fail("El inmueble ya no existe.",404);
  await rename(temp,target);
  return NextResponse.json({ok:true},{headers:{"Cache-Control":"no-store"}});
 }catch(error){
  console.error("[property-pdf] save error",error instanceof Error?error.name:"unknown");
  return fail("No fue posible guardar el documento. Comprueba el almacenamiento privado.",500);
 }finally{
  try{await unlink(temp);}catch{/* File was renamed or already removed. */}
 }
}

export async function DELETE(req:NextRequest,{params}:{params:Promise<{id:string}>}){
 const {id}=await params;
 const resolved=await identify(id);
 if("disabled" in resolved)return fail("Módulo desactivado",403);
 const {admin,property}=resolved;
 if(!admin.canEdit)return fail("No tienes permisos para modificar esta propiedad.",403);
 if(!property)return fail("Inmueble no encontrado.",404);
 if(!validMutationOrigin(req))return fail("Origen de solicitud no autorizado.",403);
 try{
  await unlink(customPdfPath(admin.tenantId,property.id));
  return NextResponse.json({ok:true},{headers:{"Cache-Control":"no-store"}});
 }catch(error){
  if(error&&typeof error==="object"&&"code" in error&&error.code==="ENOENT")return fail("No existe un PDF personalizado.",404);
  console.error("[property-pdf] deletion error",error instanceof Error?error.name:"unknown");
  return fail("No se pudo eliminar el PDF.",500);
 }
}
