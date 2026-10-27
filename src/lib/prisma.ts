import "server-only";
import {PrismaClient as MysqlPrismaClient} from "@prisma/client";
import {PrismaClient as PostgresPrismaClient} from "@/generated/postgres";
import {databaseUrl} from "@/lib/server-config";
import {engineFromUrl} from "@/lib/db-provider";

const g=globalThis as unknown as {webappPrisma?:MysqlPrismaClient;webappPrismaUrl?:string};
/**
 * Both Prisma schemas describe the same application models, but use distinct
 * engines; selecting by URL avoids a mysql query engine on PostgreSQL.
 * TypeScript's canonical model types are from the MySQL client.
 */
export function prismaFor(url:string):MysqlPrismaClient{
 const engine=engineFromUrl(url);
 return engine==="postgresql"
  ? new PostgresPrismaClient({datasources:{db:{url}}}) as unknown as MysqlPrismaClient
  : new MysqlPrismaClient({datasources:{db:{url}}});
}
export function getPrisma():MysqlPrismaClient{
 const url=databaseUrl();
 if(!url)throw new Error("Base de datos sin configurar. Visita /instalar.");
 if(!g.webappPrisma||g.webappPrismaUrl!==url){
  if(g.webappPrisma)void g.webappPrisma.$disconnect();
  g.webappPrisma=prismaFor(url);g.webappPrismaUrl=url;
 }
 return g.webappPrisma;
}
export const prisma=new Proxy({} as MysqlPrismaClient,{
 get(_target,prop){
  const client=getPrisma();
  const value=Reflect.get(client,prop,client);
  return typeof value==="function"?value.bind(client):value;
 }
});
