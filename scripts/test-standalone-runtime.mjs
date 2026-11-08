#!/usr/bin/env node
// Validación de contrato de instalación independiente sin conexión a la base.
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=(path)=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
const standalone=read("prisma/schema.standalone.postgres.prisma");
const client=read("src/lib/prisma-standalone.ts");
const provider=read("src/lib/db-provider.ts");
const generator=read("scripts/generate-prisma-clients.mjs");
assert.match(standalone,/model SiteConfig\s*\{/);
assert.match(standalone,/model AdminUser\s*\{/);
assert.match(standalone,/model Property\s*\{/);
assert.match(standalone,/model Lead\s*\{/);
assert.doesNotMatch(standalone,/\btenantId\b|model\s+Tenant\s*\{|model\s+Domain\s*\{/);
assert.match(client,/generated\/standalone-postgres/);
assert.match(client,/engineFromUrl\(url\)/);
assert.match(provider,/schema\.standalone\.postgres\.prisma/);
assert.match(generator,/schema\.standalone\.postgres\.prisma/);
const tenantResolver=read("src/lib/tenant.ts");
assert.match(tenantResolver,/NEXUS_STANDALONE==="true"[\s\S]*?getStandalonePrisma\(\)\.siteConfig\.findUnique/);
assert.match(tenantResolver,/configured\|\|process\.env\.NEXUS_STANDALONE==="true"\?\[\]:await prisma\.domain\.findMany/);

console.log("PASS: contrato de Prisma independiente; no se realizaron cambios en la BD.");
