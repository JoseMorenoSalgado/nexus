import "server-only";
import {prisma} from "@/lib/prisma";
import {databaseUrl} from "@/lib/server-config";
import {engineFromUrl} from "@/lib/db-provider";

/** Both tables are strictly additive and isolated from the original Lead table. */
const MYSQL_DDL=[
 `CREATE TABLE IF NOT EXISTS \`LeadCrm\` (
   \`id\` VARCHAR(191) NOT NULL,
   \`tenantId\` VARCHAR(191) NOT NULL,
   \`leadId\` VARCHAR(191) NOT NULL,
   \`status\` VARCHAR(191) NOT NULL DEFAULT 'nuevo',
   \`nextContactAt\` DATETIME(3) NULL,
   \`updatedAt\` DATETIME(3) NOT NULL,
   UNIQUE INDEX \`LeadCrm_leadId_key\`(\`leadId\`),
   INDEX \`LeadCrm_tenantId_status_idx\`(\`tenantId\`,\`status\`),
   PRIMARY KEY (\`id\`),
   CONSTRAINT \`LeadCrm_leadId_fkey\` FOREIGN KEY (\`leadId\`) REFERENCES \`Lead\`(\`id\`) ON DELETE CASCADE ON UPDATE CASCADE
 ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
 `CREATE TABLE IF NOT EXISTS \`LeadNote\` (
   \`id\` VARCHAR(191) NOT NULL,
   \`tenantId\` VARCHAR(191) NOT NULL,
   \`leadId\` VARCHAR(191) NOT NULL,
   \`authorName\` VARCHAR(191) NOT NULL,
   \`body\` TEXT NOT NULL,
   \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
   INDEX \`LeadNote_tenantId_leadId_createdAt_idx\`(\`tenantId\`,\`leadId\`,\`createdAt\`),
   PRIMARY KEY (\`id\`),
   CONSTRAINT \`LeadNote_leadId_fkey\` FOREIGN KEY (\`leadId\`) REFERENCES \`Lead\`(\`id\`) ON DELETE CASCADE ON UPDATE CASCADE
 ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
];
const POSTGRES_DDL=[
 `CREATE TABLE IF NOT EXISTS "LeadCrm" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "leadId" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'nuevo',
  "nextContactAt" TIMESTAMP(3),
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "LeadCrm_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "LeadCrm_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE
 )`,
 `CREATE UNIQUE INDEX IF NOT EXISTS "LeadCrm_leadId_key" ON "LeadCrm"("leadId")`,
 `CREATE INDEX IF NOT EXISTS "LeadCrm_tenantId_status_idx" ON "LeadCrm"("tenantId","status")`,
 `CREATE TABLE IF NOT EXISTS "LeadNote" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "leadId" TEXT NOT NULL,
  "authorName" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LeadNote_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "LeadNote_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE
 )`,
 `CREATE INDEX IF NOT EXISTS "LeadNote_tenantId_leadId_createdAt_idx" ON "LeadNote"("tenantId","leadId","createdAt")`
];
function missingTable(error:unknown){
 return !!(error&&typeof error==="object"&&"code" in error&&error.code==="P2021");
}
export async function crmTablesReady(){
 try{
  await Promise.all([prisma.leadCrm.count(),prisma.leadNote.count()]);
  return true;
 }catch(error){
  if(missingTable(error))return false;
  throw error;
 }
}
/** Called ONLY from an admin-only CSRF-checked POST; never from public GETs. */
export async function activateCrm(){
 const url=databaseUrl();
 if(!url)throw new Error("No existe configuración SQL.");
 const statements=engineFromUrl(url)==="postgresql"?POSTGRES_DDL:MYSQL_DDL;
 for(const sql of statements)await prisma.$executeRawUnsafe(sql);
 if(!await crmTablesReady())throw new Error("No se pudieron crear las tablas CRM.");
}
