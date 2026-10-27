import "server-only";
import {prisma} from "@/lib/prisma";
import {databaseUrl} from "@/lib/server-config";
import {engineFromUrl} from "@/lib/db-provider";

function isMissingTable(error:unknown){
 return !!(error&&typeof error==="object"&&"code" in error&&error.code==="P2021");
}
export async function agendaTableReady(){
 try{await prisma.agendaEvent.count();return true;}
 catch(error){if(isMissingTable(error))return false;throw error;}
}
/** Call only from an admin-authorized, same-origin POST, not a page render. */
export async function activateAgendaTable(){
 const url=databaseUrl();
 if(!url)throw new Error("Falta configurar la base de datos.");
 const mysql=`CREATE TABLE IF NOT EXISTS \`AgendaEvent\` (
  \`id\` VARCHAR(191) NOT NULL,
  \`tenantId\` VARCHAR(191) NOT NULL,
  \`leadId\` VARCHAR(191) NOT NULL,
  \`type\` VARCHAR(191) NOT NULL,
  \`title\` VARCHAR(191) NOT NULL,
  \`startsAt\` DATETIME(3) NOT NULL,
  \`durationMinutes\` INTEGER NOT NULL DEFAULT 60,
  \`location\` VARCHAR(191) NULL,
  \`notes\` TEXT NULL,
  \`status\` VARCHAR(191) NOT NULL DEFAULT 'pendiente',
  \`createdByName\` VARCHAR(191) NOT NULL,
  \`completedAt\` DATETIME(3) NULL,
  \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  \`updatedAt\` DATETIME(3) NOT NULL,
  INDEX \`AgendaEvent_tenantId_startsAt_idx\`(\`tenantId\`,\`startsAt\`),
  INDEX \`AgendaEvent_tenantId_leadId_startsAt_idx\`(\`tenantId\`,\`leadId\`,\`startsAt\`),
  PRIMARY KEY (\`id\`),
  CONSTRAINT \`AgendaEvent_leadId_fkey\` FOREIGN KEY (\`leadId\`) REFERENCES \`Lead\`(\`id\`) ON DELETE CASCADE ON UPDATE CASCADE
 ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`;
 const postgres=[
  `CREATE TABLE IF NOT EXISTS "AgendaEvent" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "durationMinutes" INTEGER NOT NULL DEFAULT 60,
    "location" TEXT,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pendiente',
    "createdByName" TEXT NOT NULL,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AgendaEvent_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "AgendaEvent_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE
  )`,
  `CREATE INDEX IF NOT EXISTS "AgendaEvent_tenantId_startsAt_idx" ON "AgendaEvent"("tenantId","startsAt")`,
  `CREATE INDEX IF NOT EXISTS "AgendaEvent_tenantId_leadId_startsAt_idx" ON "AgendaEvent"("tenantId","leadId","startsAt")`
 ];
 for(const sql of engineFromUrl(url)==="postgresql"?postgres:[mysql])await prisma.$executeRawUnsafe(sql);
 if(!await agendaTableReady())throw new Error("No se pudo activar la agenda.");
}
