/** Shared safe slug policy, importable in browser and server. */
const customSlug=/^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export function validCustomSlug(slug:string){
 return slug.length>=3&&slug.length<=65&&customSlug.test(slug)&&
 !["nueva","editar","menu","admin","api","instalar"].includes(slug);
}
