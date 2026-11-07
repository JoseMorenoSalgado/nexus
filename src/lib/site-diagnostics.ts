import "server-only";
import {randomUUID} from "node:crypto";
export type DiagnosticCode="PUBLIC_HOST_UNRESOLVED"|"PUBLIC_TENANT_REJECTED"|"PUBLIC_DATABASE_MISSING"|"PUBLIC_CONTEXT_EXCEPTION";
export function reportPublicDiagnostic(code:DiagnosticCode,details:Record<string,string|boolean|number|null>={}){
 const id=randomUUID();
 // Deliberately exclude request headers, secrets, cookies and SQL URLs.
 console.error(JSON.stringify({component:"nexus-public",id,code,time:new Date().toISOString(),...details}));
 return id;
}
