import "server-only";
import {PrismaClient as StandalonePrismaClient} from "@/generated/standalone-postgres";
import {databaseUrl} from "@/lib/server-config";
import {engineFromUrl} from "@/lib/db-provider";

/**
 * Explicit independent-site database client.
 * Do not silently fall back to the legacy tenant-aware client.
 * This module can be adopted incrementally by migrated routes.
 */
const globalClients=globalThis as unknown as {
  nexusStandalonePrisma?:StandalonePrismaClient;
  nexusStandaloneDatabaseUrl?:string;
};
export function getStandalonePrisma():StandalonePrismaClient {
  const url=databaseUrl();
  if(!url)throw new Error("La base de datos de Nexus no está configurada.");
  if(engineFromUrl(url)!=="postgresql"){
    throw new Error("La instalación independiente requiere PostgreSQL.");
  }
  if(!globalClients.nexusStandalonePrisma || globalClients.nexusStandaloneDatabaseUrl!==url){
    if(globalClients.nexusStandalonePrisma)void globalClients.nexusStandalonePrisma.$disconnect();
    globalClients.nexusStandalonePrisma=new StandalonePrismaClient({datasources:{db:{url}}});
    globalClients.nexusStandaloneDatabaseUrl=url;
  }
  return globalClients.nexusStandalonePrisma;
}
