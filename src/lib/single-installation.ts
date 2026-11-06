import { prisma } from "@/lib/prisma";

/**
 * A standalone installation must have exactly one ACTIVE organization.
 * Inactive historical organizations can remain after migration without
 * preventing the public site from resolving. Never choose arbitrarily
 * when more than one active organization exists.
 */
export async function singleInstallationTenantId(): Promise<string | null> {
  const active = await prisma.tenant.findMany({
    where: { active: true },
    select: { id: true },
    take: 2,
  });
  return active.length === 1 ? active[0].id : null;
}
