#!/usr/bin/env node
/**
 * Read-only preflight for the Nexus standalone schema migration.
 * Never prints credentials, modifies records, or drops tables.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
try {
  const organizations = await prisma.tenant.findMany({
    select: { id: true, active: true, _count: { select: { properties: true, admins: true, leads: true, domains: true } } },
    take: 100,
  });
  const active = organizations.filter((item) => item.active);
  const result = {
    mode: "standalone",
    safeToMigrate: organizations.length === 1 && active.length === 1,
    organizationCount: organizations.length,
    activeOrganizationCount: active.length,
    records: organizations.map(({ active, _count }) => ({ active, properties: _count.properties, users: _count.admins, leads: _count.leads, domains: _count.domains })),
    nextStep: "Review schema references and take a verified PostgreSQL backup before any destructive migration.",
  };
  process.stdout.write(JSON.stringify(result, null, 2) + "\n");
  if (!result.safeToMigrate) process.exitCode = 1;
} catch (error) {
  console.error("Standalone migration preflight failed:", error instanceof Error ? error.name : "unknown");
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
