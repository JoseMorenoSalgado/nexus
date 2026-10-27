import "server-only";
import {prisma} from "@/lib/prisma";
import {databaseUrl} from "@/lib/server-config";
import {engineFromUrl} from "@/lib/db-provider";

export async function commissionTableReady(){
 try{await prisma.commissionPayment.count();return true;}
 catch(error){
  if(error&&typeof error==="object"&&"code" in error&&error.code==="P2021")return false;
  throw error;
 }
}
/** Privileged, backup-confirmed activation only; does not run during app boot. */
export async function activateCommissionPayments(){
 const url=databaseUrl();if(!url)throw Error("DATABASE_NOT_CONFIGURED");
 const mysql=`CREATE TABLE IF NOT EXISTS \`CommissionPayment\` (
 \`id\` VARCHAR(191) NOT NULL,\`tenantId\` VARCHAR(191) NOT NULL,
 \`closingId\` VARCHAR(191) NOT NULL,\`amount\` DECIMAL(13,2) NOT NULL,
 \`paidAt\` DATETIME(3) NOT NULL,\`method\` VARCHAR(191) NOT NULL DEFAULT 'transferencia',
 \`reference\` VARCHAR(191) NULL,\`notes\` TEXT NULL,
 \`createdByName\` VARCHAR(191) NOT NULL,\`status\` VARCHAR(191) NOT NULL DEFAULT 'confirmado',
 \`voidReason\` TEXT NULL,\`voidedAt\` DATETIME(3) NULL,\`voidedByName\` VARCHAR(191) NULL,
 \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
 PRIMARY KEY (\`id\`),
 INDEX \`CommissionPayment_tenantId_closingId_paidAt_idx\`(\`tenantId\`,\`closingId\`,\`paidAt\`),
 INDEX \`CommissionPayment_tenantId_paidAt_idx\`(\`tenantId\`,\`paidAt\`),
 CONSTRAINT \`CommissionPayment_closingId_fkey\` FOREIGN KEY (\`closingId\`) REFERENCES \`CommercialClosing\`(\`id\`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`;
 const pg=[
 `CREATE TABLE IF NOT EXISTS "CommissionPayment" ("id" TEXT NOT NULL,"tenantId" TEXT NOT NULL,
 "closingId" TEXT NOT NULL,"amount" DECIMAL(13,2) NOT NULL,
 "paidAt" TIMESTAMP(3) NOT NULL,"method" TEXT NOT NULL DEFAULT 'transferencia',
 "reference" TEXT,"notes" TEXT,"createdByName" TEXT NOT NULL,
 "status" TEXT NOT NULL DEFAULT 'confirmado',"voidReason" TEXT,"voidedAt" TIMESTAMP(3),
 "voidedByName" TEXT,"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "CommissionPayment_pkey" PRIMARY KEY ("id"),
 CONSTRAINT "CommissionPayment_closingId_fkey" FOREIGN KEY ("closingId") REFERENCES "CommercialClosing"("id") ON DELETE RESTRICT ON UPDATE CASCADE)`,
 `CREATE INDEX IF NOT EXISTS "CommissionPayment_tenantId_closingId_paidAt_idx" ON "CommissionPayment"("tenantId","closingId","paidAt")`,
 `CREATE INDEX IF NOT EXISTS "CommissionPayment_tenantId_paidAt_idx" ON "CommissionPayment"("tenantId","paidAt")`
 ];
 for(const sql of engineFromUrl(url)==="postgresql"?pg:[mysql])await prisma.$executeRawUnsafe(sql);
 if(!await commissionTableReady())throw Error("COMMISSION_TABLE_NOT_READY");
}
