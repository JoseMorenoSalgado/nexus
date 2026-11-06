/**
 * Read-only preflight for a NEW isolated PostgreSQL installation.
 * Run from the deployed application with: npx tsx scripts/check-standalone-postgres.ts
 * Does not create, migrate, delete, or print credentials.
 */
import { PrismaClient } from "../src/generated/postgres";
import { engineFromUrl } from "../src/lib/db-provider";
import { validateStandaloneSnapshot } from "../src/lib/standalone-installation";

async function main() {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) throw new Error("No database connection configured.");
  if (engineFromUrl(url) !== "postgresql") {
    throw new Error("This rebuild requires a PostgreSQL connection.");
  }
  const prisma = new PrismaClient({datasources:{db:{url}}});
  try {
  await prisma.$queryRaw`SELECT 1`;
  const [activeOrganizations, total, domains, admin] = await Promise.all([
    prisma.tenant.findMany({ where: { active: true }, select: { id: true }, take: 2 }),
    prisma.tenant.count(),
    prisma.domain.findMany({ select: { hostname: true, tenantId: true, tenant: { select: { active: true } } }, take: 100 }),
    prisma.adminUser.findMany({ where: { active: true, role: "admin", tenant: { active: true } }, select: { tenantId: true }, take: 2 }),
  ]);
  const canonical = process.env.SITE_URL?.trim();
  const host = canonical ? new URL(canonical).hostname.toLowerCase().replace(/^www\\./, "") : null;
  const domain = host ? domains.find(d => d.hostname.toLowerCase().replace(/^www\\./, "") === host) : null;
  const installationId = validateStandaloneSnapshot({
    activeOrganizationIds: activeOrganizations.map(t => t.id),
    domainOrganizationId: domain?.tenantId ?? null,
    domainOrganizationActive: domain?.tenant.active ?? false,
    adminOrganizationId: admin.length === 1 ? admin[0].tenantId : null,
  });
  console.log(JSON.stringify({
    database: "postgresql",
    connectivity: "ok",
    organizations: total,
    activeOrganizations: activeOrganizations.length,
    registeredDomains: domains.map(d => d.hostname),
    installationReady: Boolean(installationId),
  }, null, 2));
  if (!installationId) {
    throw new Error("Standalone installation requires one active organization, canonical SITE_URL domain and one active administrator.");
  }
  } finally { await prisma.$disconnect(); }
}
main().catch(error => {
  console.error("[standalone-postgres-check]", error instanceof Error ? error.message : "Unexpected error");
  process.exitCode = 1;
});
