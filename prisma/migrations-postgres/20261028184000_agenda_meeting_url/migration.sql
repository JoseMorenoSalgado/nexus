-- Additive PostgreSQL migration. Back up DB first.
ALTER TABLE "AgendaEvent" ADD COLUMN IF NOT EXISTS "meetingUrl" VARCHAR(500);
