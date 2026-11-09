import "server-only";
import {getStandalonePrisma} from "@/lib/prisma-standalone";

/** Public catalogue for fresh standalone installations: no tenant/domain lookup. */
export async function listStandalonePublishedProperties(){
 return getStandalonePrisma().property.findMany({
  where:{published:true},
  include:{photos:{orderBy:{sortOrder:"asc"}}},
  orderBy:{createdAt:"desc"}
 });
}
export async function findStandalonePublishedProperty(slug:string){
 return getStandalonePrisma().property.findFirst({
  where:{slug,published:true},
  include:{photos:{orderBy:{sortOrder:"asc"}}}
 });
}
export async function listStandaloneAdminProperties(){
 return getStandalonePrisma().property.findMany({
  include:{photos:{orderBy:{sortOrder:"asc"}},assignedAgent:{select:{id:true,name:true,email:true}}},
  orderBy:{createdAt:"desc"}
 });
}
export async function listStandaloneLeads(){
 return getStandalonePrisma().lead.findMany({
  include:{property:{select:{id:true,refCode:true,title:true}},assignedAgent:{select:{id:true,name:true}},crm:true},
  orderBy:{createdAt:"desc"}
 });
}
export async function listStandaloneAgents(){
 return getStandalonePrisma().adminUser.findMany({
  where:{active:true},
  select:{id:true,name:true,email:true,role:true,active:true},
  orderBy:{name:"asc"}
 });
}
export async function listStandaloneAgenda(){
 return getStandalonePrisma().agendaEvent.findMany({
  include:{lead:{select:{id:true,name:true,phone:true}}},
  orderBy:{startsAt:"asc"}
 });
}
export async function getStandaloneSiteConfig(){
 return getStandalonePrisma().siteConfig.findUnique({where:{id:"main"}});
}
