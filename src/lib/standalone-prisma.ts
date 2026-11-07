import "server-only";
import {PrismaClient as StandalonePrismaClient} from "@/generated/standalone-postgres";
import {databaseUrl} from "@/lib/server-config";
import {engineFromUrl} from "@/lib/db-provider";

/**
 * Explicitly typed standalone PostgreSQL client. Do not cast it to the legacy
 * MySQL Prisma type: the latter contains Tenant and tenantId relationships.
 * Opt-in for newly migrated routes only; legacy routes remain unchanged.
 */
const globalStore=globalThis as unknown as {
  nexusStandalonePrisma?:StandalonePrismaClient;
  nexusStandaloneUrl?:string;
};

export function standalonePrismaFor(url:string):StandalonePrismaClient{
  if(engineFromUrl(url)!=="postgresql"){
    throw new Error("El modo independiente requiere PostgreSQL.");
  }
  return new StandalonePrismaClient({datasources:{db:{url}}});
}

export function getStandalonePrisma():StandalonePrismaClient{
  if(process.env.NEXUS_STANDALONE_MODE!=="true"){
    throw new Error("El cliente independiente requiere NEXUS_STANDALONE_MODE=true.");
  }
  const url=databaseUrl();
  if(!url)throw new Error("Base de datos sin configurar. Visita /instalar.");
  if(engineFromUrl(url)!=="postgresql"){
    throw new Error("El modo independiente requiere PostgreSQL.");
  }
  if(!globalStore.nexusStandalonePrisma||globalStore.nexusStandaloneUrl!==url){
    if(globalStore.nexusStandalonePrisma)void globalStore.nexusStandalonePrisma.$disconnect();
    globalStore.nexusStandalonePrisma=standalonePrismaFor(url);
    globalStore.nexusStandaloneUrl=url;
  }
  return globalStore.nexusStandalonePrisma;
}
