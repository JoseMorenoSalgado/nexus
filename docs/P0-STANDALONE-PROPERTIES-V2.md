# P0 — Standalone properties v2: initial audit and execution gates

Base: `main`. Branch: `fix/standalone-properties-v2`. Mode: `NEXUS_STANDALONE=true`, PostgreSQL.

## Confirmed from source (not production diagnosis)

- `src/app/api/admin/properties/route.ts` already creates via `createStandalonePropertyWithReference` and redirects to the editor.
- `src/app/api/admin/properties/[id]/route.ts` already handles save, publish, unpublish and delete with a standalone client.
- `src/lib/catalog.ts` already reads published standalone properties.
- `src/lib/property-editor-data.ts` already loads the standalone property and photos.
- `prisma/schema.standalone.postgres.prisma` declares unique `refCode` and `slug`, plus photos, leads, agent and commercial closing relations.
- `src/lib/property-reference.ts` already allocates references in a serializable transaction.
- `src/app/admin/actions.ts` retains a legacy `createProperty` action that writes to the tenant-aware Prisma client; verify whether any active form still calls it before changing or deleting it.

## Specific risks to resolve

1. Standalone delete calls `property.delete` while `CommercialClosing.property` has `onDelete: Restrict`. Catch and report the appropriate constraint error; never erase financial history.
2. The standalone editor's agent scope must match the authorization scope used by all photo, PDF, public and prospect routes.
3. A successful redirect does not prove the public page can resolve the same slug or that photos/PDF use the same storage context.
4. The old tenant-aware `createProperty` action could cause wrong-client writes if still reachable.
5. Validate database schema and generated client consistency against the deployed migration history, without resetting production.

## Implementation order

1. Inventory every route, server action and component that reads/writes properties, including photo upload/deletion, PDF, public detail and lead links.
2. Define one standalone property service backed by the existing standalone Prisma client, and migrate call sites incrementally without duplicating tables.
3. Centralize authorization, validation, reference allocation and error classification.
4. Verify public catalog/detail visibility only for published records and ensure editor lookup works immediately after create.
5. Test photos, PDF and agent/prospect associations against a disposable PostgreSQL test database.
6. Run Prisma validate/generate, typecheck, lint, build, unit and integration tests; record exact command results and failure evidence.
7. Prepare a reviewed deployment, backup verification, smoke-test and rollback plan before requesting merge.

## Release gate

No merge until automated tests and an end-to-end standalone PostgreSQL test pass for create → edit → photos → publish → catalog/detail → PDF → agent/lead → unpublish. No destructive migration, `db push --force-reset`, production data changes or automatic merge.
