import { prisma } from "@/lib/prisma";

/** A standalone deployment owns exactly one organization and database.
 * Keep tenantId as a legacy foreign key until a separate data migration.
 * Fail closed if the database contains multiple organizations.
 */
export async function singleInstallationTenantId(): Promise<string | null> {
  const tenants = await prisma.tenant.findMany({ select: { id: true }, take: 2 });
  return tenants.length === 1 ? tenants[0].id : null;
}
