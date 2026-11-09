import "server-only";
import {notFound} from "next/navigation";
import {requireRole} from "@/lib/auth";
import {propertyWhere,managesAllLeads} from "@/lib/agent-scope";
import {isStandaloneMode} from "@/lib/installation-mode";
import {prisma} from "@/lib/prisma";
import {getStandalonePrisma} from "@/lib/prisma-standalone";
import type {Prisma} from "@/generated/standalone-postgres";
import {parseRoles} from "@/lib/roles";

const select={
 id:true,slug:true,refCode:true,title:true,city:true,neighborhood:true,
 type:true,operation:true,price:true,bedrooms:true,bathrooms:true,areaM2:true,
 description:true,featured:true,published:true,assignedAgentId:true,
 photos:{orderBy:[{sortOrder:"asc"},{id:"asc"}],select:{id:true,url:true,alt:true}}
} satisfies Prisma.PropertySelect;

export async function loadPropertyEditor(id:string){
 const admin=await requireRole(["admin","editor","agente"]);
 const canAssign=managesAllLeads(admin);
 const db=isStandaloneMode()?getStandalonePrisma():null;
 const scope=canAssign?{}:{assignedAgentId:admin.userId};
 const property=db
  ?await db.property.findFirst({where:{id,...scope},select})
  :await prisma.property.findFirst({where:{id,...propertyWhere(admin)},select});
 if(!property)notFound();

 const userSelect={id:true,name:true,email:true,role:true} as const;
 const users=!canAssign?[]:db
  ?await db.adminUser.findMany({where:{active:true},select:userSelect,orderBy:{name:"asc"}})
  :await prisma.adminUser.findMany({where:{tenantId:admin.tenantId,active:true},select:userSelect,orderBy:{name:"asc"}});
 const agents=users.filter(user=>parseRoles(user.role).includes("agente")).map(({id,name,email})=>({id,name,email}));
 const {photos,...fields}=property;
 return {
  property:{...fields,price:Number(fields.price)},photos,agents,canAssign,
  canDelete:admin.roles.includes("admin"),siteId:admin.tenantId
 };
}
