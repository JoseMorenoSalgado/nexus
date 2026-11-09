import {requireAdmin} from "@/lib/auth";
import {getStandalonePrisma} from "@/lib/prisma-standalone";
import {independentLeadSources} from "@/lib/lead-sources";
import {parseRoles} from "@/lib/roles";
import {notFound} from "next/navigation";
import ProspectosClient from "./prospectos-client";
export const dynamic="force-dynamic";
export default async function ProspectosStandalonePage({query="",propertyId="",register=false}:{query?:string;propertyId?:string;register?:boolean}){
 if(process.env.NEXUS_STANDALONE!=="true")notFound();
 const admin=await requireAdmin();
 if(!admin.roles.some(role=>["admin","editor","agente"].includes(role)))notFound();
 const isAdmin=admin.roles.includes("admin")||admin.roles.includes("editor");
 const agents=isAdmin?await getStandalonePrisma().adminUser.findMany({where:{active:true},select:{id:true,name:true,role:true},orderBy:{name:"asc"}}):[];
 const db=getStandalonePrisma();
 const scope=isAdmin?{}:{assignedAgentId:admin.userId};
 const select={id:true,refCode:true,title:true} as const;
 const [properties,channels]=await Promise.all([
  db.property.findMany({where:scope,select,orderBy:{createdAt:"desc"},take:200}),
  independentLeadSources()
 ]);
 const selected=propertyId&&propertyId.length<=100
  ?properties.find(p=>p.id===propertyId)??await db.property.findFirst({where:{...scope,id:propertyId},select}):null;
 if(propertyId&&!selected)notFound();
 if(selected&&!properties.some(p=>p.id===selected.id))properties.unshift(selected);
 return <main className="standalone-crm">
  <div className="admin-heading"><div><h1>Prospectos · CRM</h1><p>Seguimiento comercial y asignación de responsables.</p></div></div>
  <ProspectosClient channels={channels} canAssign={isAdmin} agents={agents.filter(a=>parseRoles(a.role).includes("agente")).map(({id,name})=>({id,name}))} properties={properties} query={query} selectedPropertyId={selected?.id} register={register}/>
 </main>;
}
