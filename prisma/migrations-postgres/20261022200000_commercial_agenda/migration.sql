-- Apply once to an existing PostgreSQL schema after backing up and reconciling prior migrations.
CREATE TABLE "AgendaEvent" (
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
);
CREATE INDEX "AgendaEvent_tenantId_startsAt_idx" ON "AgendaEvent"("tenantId","startsAt");
CREATE INDEX "AgendaEvent_tenantId_leadId_startsAt_idx" ON "AgendaEvent"("tenantId","leadId","startsAt");
