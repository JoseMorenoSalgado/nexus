# Nexus standalone PostgreSQL rebuild — 2026-11-06

## Scope and safeguards

- Develop only on `refactor/nexus-standalone-postgres-rebuild-20261106`. The current Enhance installation and `main` stay untouched until CI and a fresh-instance smoke test pass.
- Keep the original public design in `src/components/templates/real-estate-home.tsx`, the existing dashboard, authentication, CRM, property PDFs and responsive styles.
- Target **one application, one PostgreSQL database, one active organization, one canonical public domain**. Legacy `tenantId` foreign keys remain internal during the transition; do not perform a destructive schema rewrite.
- Do not reuse the current `installation.json` or existing database connection for the new test installation. Do not delete Enhance websites or databases.
- Secrets belong in a private persistent runtime folder, never in Git.

## Audited baseline

- Public Home exists at `src/app/page.tsx`, and renders `RealEstateHome`; a 404 can originate from `getPublicContext`, not a missing route.
- `src/lib/tenant.ts` requires exactly one active organization and validates the canonical domain.
- `src/lib/public-request-origin.ts` validates direct and proxy host headers.
- `src/lib/prisma.ts` selects the PostgreSQL Prisma client based on the installation database URL.
- `prisma/schema.postgres.prisma` defines the PostgreSQL models, while `prisma/schema.prisma` remains a MySQL compatibility schema.
- `scripts/start-server.mjs` loads the private persistent `.env` before starting Next.js.

## Fresh-instance acceptance sequence

1. Provision a NEW, empty PostgreSQL database and a SEPARATE Enhance test application, without touching the current installation.
2. Configure the test app with its own private `APP_CONFIG_DIR` and canonical HTTPS test domain; do not point its `SITE_URL` to the live domain.
3. Run the installer on that empty database and create exactly one active organization and administrator.
4. Run `npx tsx scripts/check-standalone-postgres.ts` inside the test deployment; expect PostgreSQL connectivity OK and one active organization.
5. Verify public HTTP 200 for Home and other published pages; verify login, logout, agents, properties, lead capture, permissions, PDFs and mobile layout.
6. Run `npm run db:generate`, TypeScript checking, `npm run build` and the GitHub CI checks.
7. Merge to `main` only after those checks pass. Switch Enhance deployment to the new installation only after smoke testing; preserve a rollback path.

## Known caveat

An empty PostgreSQL database does NOT by itself resolve the public 404. Until the installer has created exactly one active organization, the public resolver deliberately returns 404. Avoid a demo fallback on the production domain because it can hide installation errors.
