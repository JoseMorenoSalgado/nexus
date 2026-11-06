/**
 * Read-only preflight for a NEW isolated PostgreSQL installation.
 * Run from the deployed application with: npx tsx scripts/check-standalone-postgres.ts
 * Does not create, migrate, delete, or print credentials.
 */
import { prisma } from "../src/lib/prisma";
import { databaseUrl } from "../src/lib/server-config";
import { engineFromUrl } from "../src/lib/db-provider";

async function main() {
  const url = databaseUrl();
  if (!url) throw new Error("No database connection configured.");
  if (engineFromUrl(url) !== "postgresql") {
    throw new Error("This rebuild requires a PostgreSQL connection.");
  }
  await prisma.$queryRawUnsafe("SELECT 1");
  const [active, total, domains] = await Promise.all([
    prisma.tenant.count({ where: { active: true } }),
    prisma.tenant.count(),
    prisma.domain.findMany({ select: { hostname: true }, take: 100 }),
  ]);
  console.log(JSON.stringify({
    database: "postgresql",
    connectivity: "ok",
    organizations: total,
    activeOrganizations: active,
    registeredDomains: domains.map(d => d.hostname),
    installationReady: active === 1,
  }, null, 2));
  if (active !== 1) {
    throw new Error("Standalone installation needs exactly one active organization; finish the installer before opening public pages.");
  }
}
main().catch(error => {
  console.error("[standalone-postgres-check]", error instanceof Error ? error.message : "Unexpected error");
  process.exitCode = 1;
}).finally(() => prisma.$disconnect());
