/** Read API responses without treating a proxy or login page as JSON. */
export async function readAdminJson<T extends object=Record<string,unknown>>(response:Response,fallback:string):Promise<T>{
 if(response.redirected&&new URL(response.url).pathname==="/admin/acceso"){
  throw new Error("Tu sesión terminó. Vuelve a iniciar sesión.");
 }
 const contentType=response.headers.get("content-type")||"";
 let data:unknown;
 if(/(?:\/json|\+json)(?:;|$)/i.test(contentType)){
  try{data=await response.json();}catch{}
 }
 if(!response.ok){
  if(data&&typeof data==="object"&&"error" in data&&typeof data.error==="string")throw new Error(data.error);
  if(response.status===401)throw new Error("Tu sesión terminó. Vuelve a iniciar sesión.");
  throw new Error(fallback+" (HTTP "+response.status+").");
 }
 if(!data||typeof data!=="object"||Array.isArray(data))throw new Error(fallback+" El servidor devolvió una respuesta inesperada.");
 return data as T;
}
