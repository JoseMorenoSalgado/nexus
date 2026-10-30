-- Additive only. Existing property reference codes and prospects are untouched.
CREATE TABLE "PropertySequence" (
 "tenantId" TEXT NOT NULL,
 "prefix" TEXT NOT NULL DEFAULT 'NRE',
 "nextNumber" INTEGER NOT NULL DEFAULT 1,
 "updatedAt" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "PropertySequence_pkey" PRIMARY KEY ("tenantId"),
 CONSTRAINT "PropertySequence_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE "LeadSource" (
 "id" TEXT NOT NULL,
 "tenantId" TEXT NOT NULL,
 "code" TEXT NOT NULL,
 "name" TEXT NOT NULL,
 "active" BOOLEAN NOT NULL DEFAULT true,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "LeadSource_pkey" PRIMARY KEY ("id"),
 CONSTRAINT "LeadSource_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "LeadSource_tenantId_code_key" ON "LeadSource"("tenantId","code");
CREATE INDEX "LeadSource_tenantId_active_idx" ON "LeadSource"("tenantId","active");
CREATE TABLE "LeadPropertyHistory" (
 "id" TEXT NOT NULL,
 "tenantId" TEXT NOT NULL,
 "leadId" TEXT NOT NULL,
 "fromPropertyId" TEXT,
 "fromRef" TEXT,
 "toPropertyId" TEXT,
 "toRef" TEXT,
 "externalDescription" VARCHAR(300),
 "changedByName" TEXT NOT NULL,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "LeadPropertyHistory_pkey" PRIMARY KEY ("id"),
 CONSTRAINT "LeadPropertyHistory_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE,
 CONSTRAINT "LeadPropertyHistory_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "LeadPropertyHistory_tenantId_leadId_createdAt_idx" ON "LeadPropertyHistory"("tenantId","leadId","createdAt");
ALTER TABLE "Lead" ADD COLUMN "externalPropertyInterest" VARCHAR(300);
