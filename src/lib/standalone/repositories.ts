import "server-only";
import {standalonePrisma} from "@/lib/standalone/db";

/** Public catalogue for fresh standalone installations: no tenant/domain lookup. */
export async function listStandalonePublishedProperties(){
 return standalonePrisma().property.findMany({
  where:{published:true},
  include:{photos:{orderBy:{sortOrder:"asc"}}},
  orderBy:{createdAt:"desc"}
 });
}
export async function findStandalonePublishedProperty(slug:string){
 return standalonePrisma().property.findFirst({
  where:{slug,published:true},
  include:{photos:{orderBy:{sortOrder:"asc"}}}
 });
}
export async function listStandaloneAdminProperties(){
 return standalonePrisma().property.findMany({
  include:{photos:{orderBy:{sortOrder:"asc"}},assignedAgent:{select:{id:true,name:true,email:true}}},
  orderBy:{createdAt:"desc"}
 });
}
export async function listStandaloneLeads(){
 return standalonePrisma().lead.findMany({
  include:{property:{select:{id:true,refCode:true,title:true}},assignedAgent:{select:{id:true,name:true}},crm:true},
  orderBy:{createdAt:"desc"}
 });
}
export async function listStandaloneAgents(){
 return standalonePrisma().adminUser.findMany({
  where:{active:true},
  select:{id:true,name:true,email:true,role:true,active:true},
  orderBy:{name:"asc"}
 });
}
export async function listStandaloneAgenda(){
 return standalonePrisma().agendaEvent.findMany({
  include:{lead:{select:{id:true,name:true,phone:true}}},
  orderBy:{startsAt:"asc"}
 });
}
export async function getStandaloneSiteConfig(){
 return standalonePrisma().siteConfig.findUnique({where:{id:"main"}});
}
