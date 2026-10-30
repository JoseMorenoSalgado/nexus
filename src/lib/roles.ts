export const ROLE_LABELS={admin:"Administrador",editor:"Editor",agente:"Agente comercial",lector:"Consulta"} as const;
export type UserRole=keyof typeof ROLE_LABELS;
export const ROLE_ORDER:UserRole[]=["admin","editor","agente","lector"];
export function isUserRole(role:string):role is UserRole{return Object.prototype.hasOwnProperty.call(ROLE_LABELS,role);}
export function parseRoles(value:string):UserRole[]{
 let input:unknown=value;
 if(value.startsWith("[")){try{input=JSON.parse(value);}catch{return [];}}
 const values=Array.isArray(input)?input:[input];
 return ROLE_ORDER.filter(role=>values.includes(role));
}
export function serializeRoles(roles:UserRole[]):string{return JSON.stringify(ROLE_ORDER.filter(r=>roles.includes(r)));}
export function primaryRole(roles:UserRole[]):UserRole{return ROLE_ORDER.find(r=>roles.includes(r))||"lector";}
export function canManageUsers(role:string){return parseRoles(role).includes("admin");}
export function canEditProperties(role:string){return parseRoles(role).some(r=>r==="admin"||r==="editor"||r==="agente");}
export function canManageLeads(role:string){return parseRoles(role).some(r=>r==="admin"||r==="editor"||r==="agente");}
export function canEditSite(role:string){return parseRoles(role).some(r=>r==="admin"||r==="editor");}
export function canViewReports(role:string){return parseRoles(role).some(r=>r==="admin"||r==="editor");}
