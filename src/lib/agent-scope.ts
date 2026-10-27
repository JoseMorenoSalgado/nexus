import "server-only";
import type {Prisma} from "@prisma/client";

export type AgentScope={tenantId:string;userId:string;roles:string[]};
export function managesAllLeads(user:Pick<AgentScope,"roles">){
 return user.roles.includes("admin")||user.roles.includes("editor");
}
/** Prospect ownership is independent from property assignment.
 * An agent only sees their personally assigned leads within their tenant.
 */
export function leadWhere(user:AgentScope):Prisma.LeadWhereInput{
 return {tenantId:user.tenantId,...(!managesAllLeads(user)?{
  assignedAgentId:user.userId
 }:{})};
}
export function propertyWhere(user:AgentScope):Prisma.PropertyWhereInput{
 return {tenantId:user.tenantId,...(!managesAllLeads(user)?{assignedAgentId:user.userId}:{})};
}
