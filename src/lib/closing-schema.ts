import "server-only";
import {prisma} from "@/lib/prisma";
import {databaseUrl} from "@/lib/server-config";
import {engineFromUrl} from "@/lib/db-provider";

export async function closingTableReady(){
 try{await prisma.commercialClosing.count();return true;}
 catch(error){
  if(error&&typeof error==="object"&&"code" in error&&error.code==="P2021")return false;
  throw error;
 }
}

/** Only invoked via explicit backup-confirmed admin POST. No public GET migration. */
export async function activateClosings(){
 const url=databaseUrl();
 if(!url)throw Error("DATABASE_NOT_CONFIGURED");
 const mysql=`CREATE TABLE IF NOT EXISTS \`CommercialClosing\` (
  \`id\` VARCHAR(191) NOT NULL,
  \`tenantId\` VARCHAR(191) NOT NULL,
  \`leadId\` VARCHAR(191) NOT NULL,
  \`propertyId\` VARCHAR(191) NOT NULL,
  \`agentId\` VARCHAR(191) NULL,
  \`agentName\` VARCHAR(191) NOT NULL,
  \`propertyRefCode\` VARCHAR(191) NOT NULL,
  \`clientName\` VARCHAR(191) NOT NULL,
  \`kind\` VARCHAR(191) NOT NULL,
  \`currency\` VARCHAR(191) NOT NULL DEFAULT 'USD',
  \`amount\` DECIMAL(13,2) NOT NULL,
  \`commissionAmount\` DECIMAL(13,2) NOT NULL,
  \`closedAt\` DATETIME(3) NOT NULL,
  \`notes\` TEXT NULL,
  \`status\` VARCHAR(191) NOT NULL DEFAULT 'confirmado',
  \`voidReason\` TEXT NULL,
  \`voidedAt\` DATETIME(3) NULL,
  \`voidedByName\` VARCHAR(191) NULL,
  \`createdByName\` VARCHAR(191) NOT NULL,
  \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  \`updatedAt\` DATETIME(3) NOT NULL,
  UNIQUE INDEX \`CommercialClosing_leadId_key\`(\`leadId\`),
  INDEX \`CommercialClosing_tenantId_closedAt_idx\`(\`tenantId\`,\`closedAt\`),
  INDEX \`CommercialClosing_tenantId_agentId_closedAt_idx\`(\`tenantId\`,\`agentId\`,\`closedAt\`),
  PRIMARY KEY (\`id\`),
  CONSTRAINT \`CommercialClosing_tenantId_fkey\` FOREIGN KEY (\`tenantId\`) REFERENCES \`Tenant\`(\`id\`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT \`CommercialClosing_leadId_fkey\` FOREIGN KEY (\`leadId\`) REFERENCES \`Lead\`(\`id\`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT \`CommercialClosing_propertyId_fkey\` FOREIGN KEY (\`propertyId\`) REFERENCES \`Property\`(\`id\`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT \`CommercialClosing_agentId_fkey\` FOREIGN KEY (\`agentId\`) REFERENCES \`AdminUser\`(\`id\`) ON DELETE SET NULL ON UPDATE CASCADE
 ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`;
 const postgres=[
 `CREATE TABLE IF NOT EXISTS "CommercialClosing" (
  "id" TEXT NOT NULL,"tenantId" TEXT NOT NULL,"leadId" TEXT NOT NULL,
  "propertyId" TEXT NOT NULL,"agentId" TEXT,"agentName" TEXT NOT NULL,
  "propertyRefCode" TEXT NOT NULL,"clientName" TEXT NOT NULL,
  "kind" TEXT NOT NULL,"currency" TEXT NOT NULL DEFAULT 'USD',
  "amount" DECIMAL(13,2) NOT NULL,"commissionAmount" DECIMAL(13,2) NOT NULL,
  "closedAt" TIMESTAMP(3) NOT NULL,"notes" TEXT,"status" TEXT NOT NULL DEFAULT 'confirmado',
  "voidReason" TEXT,"voidedAt" TIMESTAMP(3),"voidedByName" TEXT,
  "createdByName" TEXT NOT NULL,"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CommercialClosing_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CommercialClosing_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "CommercialClosing_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "CommercialClosing_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "CommercialClosing_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE)`,
 `CREATE UNIQUE INDEX IF NOT EXISTS "CommercialClosing_leadId_key" ON "CommercialClosing"("leadId")`,
 `CREATE INDEX IF NOT EXISTS "CommercialClosing_tenantId_closedAt_idx" ON "CommercialClosing"("tenantId","closedAt")`,
 `CREATE INDEX IF NOT EXISTS "CommercialClosing_tenantId_agentId_closedAt_idx" ON "CommercialClosing"("tenantId","agentId","closedAt")`
 ];
 for(const sql of engineFromUrl(url)==="postgresql"?postgres:[mysql])await prisma.$executeRawUnsafe(sql);
 if(!await closingTableReady())throw Error("CLOSINGS_NOT_READY");
}
