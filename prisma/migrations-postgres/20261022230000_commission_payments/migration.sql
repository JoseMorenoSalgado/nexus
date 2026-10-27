-- Run only once after verified backup and existing CommercialClosing migration.
CREATE TABLE "CommissionPayment" (
 "id" TEXT NOT NULL,
 "tenantId" TEXT NOT NULL,
 "closingId" TEXT NOT NULL,
 "amount" DECIMAL(13,2) NOT NULL,
 "paidAt" TIMESTAMP(3) NOT NULL,
 "method" TEXT NOT NULL DEFAULT 'transferencia',
 "reference" TEXT,
 "notes" TEXT,
 "createdByName" TEXT NOT NULL,
 "status" TEXT NOT NULL DEFAULT 'confirmado',
 "voidReason" TEXT,
 "voidedAt" TIMESTAMP(3),
 "voidedByName" TEXT,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "CommissionPayment_pkey" PRIMARY KEY ("id"),
 CONSTRAINT "CommissionPayment_closingId_fkey" FOREIGN KEY ("closingId") REFERENCES "CommercialClosing"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "CommissionPayment_tenantId_closingId_paidAt_idx" ON "CommissionPayment"("tenantId","closingId","paidAt");
CREATE INDEX "CommissionPayment_tenantId_paidAt_idx" ON "CommissionPayment"("tenantId","paidAt");
