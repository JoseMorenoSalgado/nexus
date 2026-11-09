import {requireAdmin} from "@/lib/auth";
import {getStandalonePrisma} from "@/lib/prisma-standalone";
import {parseRoles} from "@/lib/roles";
import {notFound} from "next/navigation";
import ProspectosClient from "./prospectos-client";
export const dynamic="force-dynamic";
export default async function ProspectosStandalonePage(){
 if(process.env.NEXUS_STANDALONE!=="true")notFound();
 const admin=await requireAdmin();
 if(!admin.roles.some(role=>["admin","editor","agente"].includes(role)))notFound();
 const isAdmin=admin.roles.includes("admin")||admin.roles.includes("editor");
 const agents=isAdmin?await getStandalonePrisma().adminUser.findMany({where:{active:true},select:{id:true,name:true,role:true},orderBy:{name:"asc"}}):[];
 const properties=await getStandalonePrisma().property.findMany({where:isAdmin?{}:{assignedAgentId:admin.userId},select:{id:true,refCode:true,title:true},orderBy:{createdAt:"desc"},take:200});
 return <main className="standalone-crm">
  <div className="admin-heading"><div><h1>Prospectos · CRM</h1><p>Seguimiento comercial y asignación de responsables.</p></div></div>
  <ProspectosClient canAssign={isAdmin} agents={agents.filter(a=>parseRoles(a.role).includes("agente")).map(({id,name})=>({id,name}))} properties={properties}/>
 </main>;
}
