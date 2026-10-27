-- Additive commercial transaction ledger. Back up and reconcile existing migration history first.
CREATE TABLE "CommercialClosing" (
 "id" TEXT NOT NULL,
 "tenantId" TEXT NOT NULL,
 "leadId" TEXT NOT NULL,
 "propertyId" TEXT NOT NULL,
 "agentId" TEXT,
 "agentName" TEXT NOT NULL,
 "propertyRefCode" TEXT NOT NULL,
 "clientName" TEXT NOT NULL,
 "kind" TEXT NOT NULL,
 "currency" TEXT NOT NULL DEFAULT 'USD',
 "amount" DECIMAL(13,2) NOT NULL,
 "commissionAmount" DECIMAL(13,2) NOT NULL,
 "closedAt" TIMESTAMP(3) NOT NULL,
 "notes" TEXT,
 "status" TEXT NOT NULL DEFAULT 'confirmado',
 "voidReason" TEXT,
 "voidedAt" TIMESTAMP(3),
 "voidedByName" TEXT,
 "createdByName" TEXT NOT NULL,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "updatedAt" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "CommercialClosing_pkey" PRIMARY KEY ("id"),
 CONSTRAINT "CommercialClosing_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 CONSTRAINT "CommercialClosing_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 CONSTRAINT "CommercialClosing_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 CONSTRAINT "CommercialClosing_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "CommercialClosing_leadId_key" ON "CommercialClosing"("leadId");
CREATE INDEX "CommercialClosing_tenantId_closedAt_idx" ON "CommercialClosing"("tenantId","closedAt");
CREATE INDEX "CommercialClosing_tenantId_agentId_closedAt_idx" ON "CommercialClosing"("tenantId","agentId","closedAt");
