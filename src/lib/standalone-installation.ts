/**
 * Shared standalone installation invariant.
 * This is an internal organization scope, NOT multi-tenant host routing.
 * Never choose an arbitrary active organization if the database is inconsistent.
 */
export type StandaloneSnapshot = {
  activeOrganizationIds: readonly string[];
  domainOrganizationId: string | null;
  domainOrganizationActive: boolean;
  adminOrganizationId: string | null;
};
export function validateStandaloneSnapshot(snapshot: StandaloneSnapshot): string | null {
  if (snapshot.activeOrganizationIds.length !== 1) return null;
  const id = snapshot.activeOrganizationIds[0];
  return snapshot.domainOrganizationId === id &&
    snapshot.domainOrganizationActive &&
    snapshot.adminOrganizationId === id ? id : null;
}
