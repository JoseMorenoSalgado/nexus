import {requireAdmin} from "@/lib/auth";
import {getStandalonePrisma} from "@/lib/prisma-standalone";
import {parseRoles} from "@/lib/roles";
import {notFound} from "next/navigation";
import ProspectosClient from "./prospectos-client";
export const dynamic="force-dynamic";
export default async function ProspectosStandalonePage(){
 if(process.env.NEXUS_STANDALONE!=="true")notFound();
 const admin=await requireAdmin();
 if(!admin.roles.includes("admin")&&!admin.roles.includes("agente"))notFound();
 const isAdmin=admin.roles.includes("admin");
 const agents=isAdmin?await getStandalonePrisma().adminUser.findMany({where:{active:true},select:{id:true,name:true,role:true},orderBy:{name:"asc"}}):[];
 return <main style={{maxWidth:1120,margin:"2rem auto",padding:"1rem"}}>
  <h1>Prospectos · CRM</h1>
  <p>Seguimiento comercial y asignación de responsables.</p>
  <ProspectosClient canAssign={isAdmin} agents={agents.filter(a=>parseRoles(a.role).includes("agente")).map(({id,name})=>({id,name}))}/>
 </main>;
}
