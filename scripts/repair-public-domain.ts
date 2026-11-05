/**
 * One-time repair for an Enhance installation whose proxy hostname was stored
 * instead of the public hostname. Run with DATABASE_URL, SITE_URL and ADMIN_EMAIL.
 * Never reassign an existing domain or change user credentials.
 */
import {prisma} from "../src/lib/prisma";
import {normalizeSiteHost} from "../src/lib/preview";

async function main(){
 const raw=(process.env.SITE_URL||"").trim();
 const email=(process.env.ADMIN_EMAIL||"").trim().toLowerCase();
 if(!raw||!email)throw Error("SITE_URL y ADMIN_EMAIL son obligatorios.");
 const url=new URL(raw);
 if(url.protocol!=="https:"||url.username||url.password||url.pathname!=="/"||url.search||url.hash)
  throw Error("SITE_URL debe ser HTTPS y no incluir ruta.");
 const hostname=normalizeSiteHost(url.hostname);
 if(!/^[a-z0-9][a-z0-9.-]*$/.test(hostname))throw Error("Hostname inválido.");
 const users=await prisma.adminUser.findMany({
  where:{email,active:true,tenant:{active:true}},
  select:{tenantId:true,tenant:{select:{name:true}}}
 });
 if(users.length!==1)throw Error("ADMIN_EMAIL debe identificar exactamente una organización activa.");
 const tenantId=users[0].tenantId;
 await prisma.$transaction(async tx=>{
  const existing=await tx.domain.findUnique({where:{hostname},select:{tenantId:true}});
  if(existing&&existing.tenantId!==tenantId)throw Error("Dominio asociado a otra organización. No se modificó.");
  if(!existing)await tx.domain.create({data:{hostname,tenantId}});
 });
 console.log("Dominio público vinculado correctamente:",hostname,"organización:",users[0].tenant.name);
}
main().catch(e=>{console.error(e instanceof Error?e.message:"Error desconocido");process.exitCode=1;})
 .finally(()=>prisma.$disconnect());
