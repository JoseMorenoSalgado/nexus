/** Read small public JSON payloads with an enforced byte cap.
 * Content-Length is optional/untrusted: the stream is bounded as well.
 * Keeping this independent of Next.js allows focused security tests.
 */
export class RequestPayloadError extends Error {
 constructor(public readonly status:400|413, message:string){
  super(message);
  this.name="RequestPayloadError";
 }
}

export async function readJsonObjectLimited(request:Request,maxBytes:number):Promise<Record<string,unknown>>{
 const advertised=request.headers.get("content-length");
 if(advertised!==null){
  const length=Number(advertised);
  if(!Number.isSafeInteger(length)||length<0)throw new RequestPayloadError(400,"Tamaño de solicitud inválido.");
  if(length>maxBytes)throw new RequestPayloadError(413,"Solicitud demasiado grande.");
 }
 if(!request.body)throw new RequestPayloadError(400,"Se requiere un objeto JSON.");
 const reader=request.body.getReader();
 const chunks:Uint8Array[]=[];
 let size=0;
 try{
  for(;;){
   const {done,value}=await reader.read();
   if(done)break;
   size+=value.byteLength;
   if(size>maxBytes){
    await reader.cancel().catch(()=>{});
    throw new RequestPayloadError(413,"Solicitud demasiado grande.");
   }
   chunks.push(value);
  }
 }catch(error){
  if(error instanceof RequestPayloadError)throw error;
  throw new RequestPayloadError(400,"No fue posible leer la solicitud.");
 }finally{reader.releaseLock();}
 if(size===0)throw new RequestPayloadError(400,"Se requiere un objeto JSON.");
 let parsed:unknown;
 try{
  const bytes=new Uint8Array(size);
  let offset=0;
  for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}
  parsed=JSON.parse(new TextDecoder("utf-8",{fatal:true}).decode(bytes));
 }catch{throw new RequestPayloadError(400,"El JSON es inválido.");}
 if(!parsed||typeof parsed!=="object"||Array.isArray(parsed))throw new RequestPayloadError(400,"Se requiere un objeto JSON.");
 return parsed as Record<string,unknown>;
}
