-- Run once after a verified database backup and after the previous property-agent migration.
ALTER TABLE "Lead" ADD COLUMN "assignedAgentId" TEXT;
UPDATE "Lead" AS l SET "assignedAgentId"=u."id"
FROM "Property" AS p
JOIN "AdminUser" AS u ON u."id"=p."assignedAgentId" AND u."tenantId"=p."tenantId"
WHERE p."id"=l."propertyId" AND p."tenantId"=l."tenantId" AND l."assignedAgentId" IS NULL;
CREATE INDEX "Lead_tenantId_assignedAgentId_createdAt_idx" ON "Lead"("tenantId","assignedAgentId","createdAt");
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_assignedAgentId_fkey" FOREIGN KEY ("assignedAgentId") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE TABLE "LeadAssignmentHistory" (
 "id" TEXT NOT NULL,
 "tenantId" TEXT NOT NULL,
 "leadId" TEXT NOT NULL,
 "fromAgentId" TEXT,
 "fromAgentName" TEXT,
 "toAgentId" TEXT,
 "toAgentName" TEXT,
 "changedByName" TEXT NOT NULL,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "LeadAssignmentHistory_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "LeadAssignmentHistory_tenantId_leadId_createdAt_idx" ON "LeadAssignmentHistory"("tenantId","leadId","createdAt");
ALTER TABLE "LeadAssignmentHistory" ADD CONSTRAINT "LeadAssignmentHistory_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;
