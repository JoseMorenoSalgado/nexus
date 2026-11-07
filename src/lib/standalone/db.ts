import "server-only";
import {PrismaClient} from "@/generated/standalone-postgres";
import {databaseUrl} from "@/lib/server-config";
import {engineFromUrl} from "@/lib/db-provider";

/** Explicitly isolated NEW-INSTALL PostgreSQL client. Never use on legacy databases. */
const globalDb=globalThis as unknown as {nexusStandalonePrisma?:PrismaClient;nexusStandaloneUrl?:string};
export function standalonePrisma(){
 const url=databaseUrl();
 if(!url||engineFromUrl(url)!=="postgresql")throw new Error("Standalone Nexus requires a PostgreSQL DATABASE_URL");
 if(!globalDb.nexusStandalonePrisma||globalDb.nexusStandaloneUrl!==url){
  if(globalDb.nexusStandalonePrisma)void globalDb.nexusStandalonePrisma.$disconnect();
  globalDb.nexusStandalonePrisma=new PrismaClient({datasources:{db:{url}}});
  globalDb.nexusStandaloneUrl=url;
 }
 return globalDb.nexusStandalonePrisma;
}
