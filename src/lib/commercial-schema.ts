import "server-only";
import {prisma} from "@/lib/prisma";
import {databaseUrl} from "@/lib/server-config";
import {engineFromUrl} from "@/lib/db-provider";
import {activateAgendaTable} from "@/lib/agenda-schema";

type Table="Property"|"Lead"|"LeadAssignmentHistory"|"AgendaEvent";
type SchemaState={propertyAgent:boolean;leadAgent:boolean;leadHistory:boolean;agenda:boolean;ready:boolean;};
const tables:Table[]=["Property","Lead","LeadAssignmentHistory","AgendaEvent"];
const keys=["assignedAgentId"] as const;
function isPostgres(){const url=databaseUrl();if(!url)throw Error("DATABASE_NOT_CONFIGURED");return engineFromUrl(url)==="postgresql";}
async function dbRows(sql:string){return prisma.$queryRawUnsafe<Array<Record<string,unknown>>>(sql);}
async function existsTable(table:Table){
 if(!tables.includes(table))throw Error("INVALID_TABLE");
 const sql=isPostgres()
  ?`SELECT 1 AS present FROM information_schema.tables WHERE table_schema=current_schema() AND table_name='${table}' LIMIT 1`
  :`SELECT 1 AS present FROM information_schema.tables WHERE table_schema=DATABASE() AND table_name='${table}' LIMIT 1`;
 return (await dbRows(sql)).length>0;
}
async function existsColumn(table:Table,col:"assignedAgentId"){
 if(!tables.includes(table)||!keys.includes(col))throw Error("INVALID_COLUMN");
 const sql=isPostgres()
  ?`SELECT 1 AS present FROM information_schema.columns WHERE table_schema=current_schema() AND table_name='${table}' AND column_name='${col}' LIMIT 1`
  :`SELECT 1 AS present FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='${table}' AND column_name='${col}' LIMIT 1`;
 return (await dbRows(sql)).length>0;
}
async function existsIndex(table:Table,name:string){
 if(!tables.includes(table)||!/^[A-Za-z][A-Za-z0-9_]{1,90}$/.test(name))throw Error("INVALID_INDEX");
 const sql=isPostgres()
  ?`SELECT 1 AS present FROM pg_indexes WHERE schemaname=current_schema() AND tablename='${table}' AND indexname='${name}' LIMIT 1`
  :`SELECT 1 AS present FROM information_schema.statistics WHERE table_schema=DATABASE() AND table_name='${table}' AND index_name='${name}' LIMIT 1`;
 return (await dbRows(sql)).length>0;
}
async function existsForeignKey(table:Table,name:string){
 if(!tables.includes(table)||!/^[A-Za-z][A-Za-z0-9_]{1,90}$/.test(name))throw Error("INVALID_CONSTRAINT");
 const sql=isPostgres()
  ?`SELECT 1 AS present FROM information_schema.table_constraints WHERE table_schema=current_schema() AND table_name='${table}' AND constraint_name='${name}' LIMIT 1`
  :`SELECT 1 AS present FROM information_schema.table_constraints WHERE table_schema=DATABASE() AND table_name='${table}' AND constraint_name='${name}' LIMIT 1`;
 return (await dbRows(sql)).length>0;
}
export async function commercialSchemaState():Promise<SchemaState>{
 const [propertyAgent,leadAgent,leadHistory,agenda]=await Promise.all([
  existsColumn("Property","assignedAgentId"),
  existsColumn("Lead","assignedAgentId"),
  existsTable("LeadAssignmentHistory"),
  existsTable("AgendaEvent")
 ]);
 return {propertyAgent,leadAgent,leadHistory,agenda,ready:propertyAgent&&leadAgent&&leadHistory&&agenda};
}
/** Fixed, additive DDL. This is only invoked after an authenticated admin
 * confirms a backup, never from public GET, startup or health checks.
 */
export async function repairCommercialSchema(){
 const pg=isPostgres();
 if(!await existsColumn("Property","assignedAgentId")){
  await prisma.$executeRawUnsafe(pg?
   'ALTER TABLE "Property" ADD COLUMN "assignedAgentId" TEXT':
   'ALTER TABLE `Property` ADD COLUMN `assignedAgentId` VARCHAR(191) NULL');
 }
 if(!await existsIndex("Property","Property_assignedAgentId_idx")){
  await prisma.$executeRawUnsafe(pg?
   'CREATE INDEX "Property_assignedAgentId_idx" ON "Property"("assignedAgentId")':
   'CREATE INDEX `Property_assignedAgentId_idx` ON `Property`(`assignedAgentId`)');
 }
 if(!await existsForeignKey("Property","Property_assignedAgentId_fkey")){
  await prisma.$executeRawUnsafe(pg?
   'ALTER TABLE "Property" ADD CONSTRAINT "Property_assignedAgentId_fkey" FOREIGN KEY ("assignedAgentId") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE':
   'ALTER TABLE `Property` ADD CONSTRAINT `Property_assignedAgentId_fkey` FOREIGN KEY (`assignedAgentId`) REFERENCES `AdminUser`(`id`) ON DELETE SET NULL ON UPDATE CASCADE');
 }
 let addedLeadColumn=false;
 if(!await existsColumn("Lead","assignedAgentId")){
  await prisma.$executeRawUnsafe(pg?
   'ALTER TABLE "Lead" ADD COLUMN "assignedAgentId" TEXT':
   'ALTER TABLE `Lead` ADD COLUMN `assignedAgentId` VARCHAR(191) NULL');
  addedLeadColumn=true;
 }
 if(addedLeadColumn){
  // Backfill only when the column is first created; do not change existing lead owners.
  await prisma.$executeRawUnsafe(pg?
   'UPDATE "Lead" AS l SET "assignedAgentId"=u."id" FROM "Property" AS p JOIN "AdminUser" AS u ON u."id"=p."assignedAgentId" AND u."tenantId"=p."tenantId" WHERE p."id"=l."propertyId" AND p."tenantId"=l."tenantId" AND l."assignedAgentId" IS NULL':
   'UPDATE `Lead` AS l INNER JOIN `Property` AS p ON p.id=l.propertyId AND p.tenantId=l.tenantId INNER JOIN `AdminUser` AS u ON u.id=p.assignedAgentId AND u.tenantId=l.tenantId SET l.assignedAgentId=u.id WHERE l.assignedAgentId IS NULL');
 }
 if(!await existsIndex("Lead","Lead_tenantId_assignedAgentId_createdAt_idx")){
  await prisma.$executeRawUnsafe(pg?
   'CREATE INDEX "Lead_tenantId_assignedAgentId_createdAt_idx" ON "Lead"("tenantId","assignedAgentId","createdAt")':
   'CREATE INDEX `Lead_tenantId_assignedAgentId_createdAt_idx` ON `Lead`(`tenantId`,`assignedAgentId`,`createdAt`)');
 }
 if(!await existsForeignKey("Lead","Lead_assignedAgentId_fkey")){
  await prisma.$executeRawUnsafe(pg?
   'ALTER TABLE "Lead" ADD CONSTRAINT "Lead_assignedAgentId_fkey" FOREIGN KEY ("assignedAgentId") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE':
   'ALTER TABLE `Lead` ADD CONSTRAINT `Lead_assignedAgentId_fkey` FOREIGN KEY (`assignedAgentId`) REFERENCES `AdminUser`(`id`) ON DELETE SET NULL ON UPDATE CASCADE');
 }
 if(!await existsTable("LeadAssignmentHistory")){
  await prisma.$executeRawUnsafe(pg?
   `CREATE TABLE "LeadAssignmentHistory" ("id" TEXT NOT NULL, "tenantId" TEXT NOT NULL, "leadId" TEXT NOT NULL, "fromAgentId" TEXT, "fromAgentName" TEXT, "toAgentId" TEXT, "toAgentName" TEXT, "changedByName" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "LeadAssignmentHistory_pkey" PRIMARY KEY ("id"))`:
   `CREATE TABLE \`LeadAssignmentHistory\` (\`id\` VARCHAR(191) NOT NULL,\`tenantId\` VARCHAR(191) NOT NULL,\`leadId\` VARCHAR(191) NOT NULL,\`fromAgentId\` VARCHAR(191) NULL,\`fromAgentName\` VARCHAR(191) NULL,\`toAgentId\` VARCHAR(191) NULL,\`toAgentName\` VARCHAR(191) NULL,\`changedByName\` VARCHAR(191) NOT NULL,\`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),PRIMARY KEY (\`id\`)) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
 }
 if(!await existsIndex("LeadAssignmentHistory","LeadAssignmentHistory_tenantId_leadId_createdAt_idx")){
  await prisma.$executeRawUnsafe(pg?
   'CREATE INDEX "LeadAssignmentHistory_tenantId_leadId_createdAt_idx" ON "LeadAssignmentHistory"("tenantId","leadId","createdAt")':
   'CREATE INDEX `LeadAssignmentHistory_tenantId_leadId_createdAt_idx` ON `LeadAssignmentHistory`(`tenantId`,`leadId`,`createdAt`)');
 }
 if(!await existsForeignKey("LeadAssignmentHistory","LeadAssignmentHistory_leadId_fkey")){
  await prisma.$executeRawUnsafe(pg?
   'ALTER TABLE "LeadAssignmentHistory" ADD CONSTRAINT "LeadAssignmentHistory_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE':
   'ALTER TABLE `LeadAssignmentHistory` ADD CONSTRAINT `LeadAssignmentHistory_leadId_fkey` FOREIGN KEY (`leadId`) REFERENCES `Lead`(`id`) ON DELETE CASCADE ON UPDATE CASCADE');
 }
 if(!await existsTable("AgendaEvent"))await activateAgendaTable();
 return commercialSchemaState();
}
