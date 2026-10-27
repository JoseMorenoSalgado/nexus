import {PrismaClient as MysqlPrismaClient} from "@prisma/client";
import {PrismaClient as PostgresPrismaClient} from "../src/generated/postgres";
import {engineFromUrl} from "../src/lib/db-provider";
import {scryptSync,randomBytes} from "node:crypto";
const url=process.env.DATABASE_URL;
if(!url)throw Error("DATABASE_URL requerida para seed");
const prisma=engineFromUrl(url)==="postgresql" ? new PostgresPrismaClient({datasources:{db:{url}}}) as unknown as MysqlPrismaClient : new MysqlPrismaClient({datasources:{db:{url}}});
const properties=[
 {refCode:"NX-102",slug:"casa-zona-ejecutiva",title:"Casa moderna en Zona Ejecutiva",city:"Managua",neighborhood:"Zona Ejecutiva",type:"Casa",operation:"venta",price:250000,bedrooms:4,bathrooms:3,areaM2:320,description:"Propiedad de demostración; fotografías, precio y características ilustrativos.",url:"https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1100"},
 {refCode:"NX-205",slug:"apartamento-torre-norte",title:"Apartamento Torre Norte",city:"Managua",neighborhood:"Centro",type:"Apartamento",operation:"alquiler",price:1200,bedrooms:3,bathrooms:2,areaM2:180,description:"Propiedad de demostración; fotografías, precio y características ilustrativos.",url:"https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=1100"},
 {refCode:"NX-301",slug:"casa-las-colinas",title:"Casa familiar en Las Colinas",city:"Managua",neighborhood:"Las Colinas",type:"Casa",operation:"venta",price:180000,bedrooms:3,bathrooms:2,areaM2:250,description:"Propiedad de demostración; fotografías, precio y características ilustrativos.",url:"https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?w=1100"}
];
async function main(){
 const t=await prisma.tenant.upsert({where:{slug:"nexus"},update:{},create:{name:"Nexus Real Estate",slug:"nexus",tagline:"Pensando en tu futuro",primaryColor:"#cf202b"}});
 const host=(process.env.SEED_DOMAIN||"localhost").toLowerCase();
 await prisma.domain.upsert({where:{hostname:host},update:{tenantId:t.id},create:{hostname:host,tenantId:t.id}});
 for(const p of properties){
  await prisma.property.upsert({where:{tenantId_slug:{tenantId:t.id,slug:p.slug}},update:{},create:{tenantId:t.id,slug:p.slug,refCode:p.refCode,title:p.title,city:p.city,neighborhood:p.neighborhood,type:p.type,operation:p.operation,price:p.price,description:p.description,bedrooms:p.bedrooms,bathrooms:p.bathrooms,areaM2:p.areaM2,published:true,photos:{create:{url:p.url,alt:p.title}}}});
 }
 const email=process.env.ADMIN_EMAIL?.trim().toLowerCase(),password=process.env.ADMIN_PASSWORD;
 if(email&&password){
  if(password.length<14)throw Error("ADMIN_PASSWORD requiere al menos 14 caracteres");
  const salt=randomBytes(16).toString("hex"),hash="scrypt$"+salt+"$"+scryptSync(password,salt,64).toString("hex");
  await prisma.adminUser.upsert({where:{tenantId_email:{tenantId:t.id,email}},update:{},create:{tenantId:t.id,email,name:"Administrador Nexus",passwordHash:hash,role:"admin"}});
  console.log("Administrador inicial registrado si no existía. Nunca se actualiza su contraseña desde el seed.");
 }else console.log("Sin ADMIN_EMAIL/ADMIN_PASSWORD: no se ha creado administrador.");
 console.log("Plantilla Nexus lista. Actualizar dominio y propiedades reales antes de producción.");
}
main().catch(e=>{console.error(e);process.exitCode=1}).finally(()=>prisma.$disconnect());
