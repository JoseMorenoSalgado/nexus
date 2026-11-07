#!/usr/bin/env node
/**
 * Non-destructive standalone migration gate.
 * Checks the three Prisma schemas and runtime selector. No database connection
 * and no credentials are required. Use before any production schema migration.
 */
import {readFileSync} from "node:fs";
import {resolve} from "node:path";
const read = path => readFileSync(resolve(path),"utf8");
const legacy = ["prisma/schema.prisma","prisma/schema.postgres.prisma"];
const standalonePath="prisma/schema.standalone.postgres.prisma";
const standalone=read(standalonePath);
const runtime=read("src/lib/prisma.ts");
const generator=read("scripts/generate-prisma-clients.mjs");
const models=[...standalone.matchAll(/^model\s+(\w+)\s*\{/gm)].map(m=>m[1]);
const checks=[
 {name:"Standalone PostgreSQL datasource",ok:/provider\s*=\s*"postgresql"/.test(standalone)},
 {name:"Standalone has no Tenant or Domain models",ok:!/^model\s+(Tenant|Domain)\s*\{/m.test(standalone)},
 {name:"Standalone has no tenantId fields",ok:!/^\s*tenantId\s+/m.test(standalone)},
 {name:"Standalone contains critical models",ok:["Property","Lead","AdminUser","AdminSession","SiteConfig","PropertySequence"].every(m=>models.includes(m))},
 {name:"Standalone Prisma client generated",ok:generator.includes(standalonePath)},
 {name:"Runtime imports standalone client",ok:runtime.includes("generated/standalone-postgres")},
 {name:"Runtime selects standalone client",ok:/standalone/i.test(runtime)&&/standalone/i.test(runtime.match(/function getPrisma[\s\S]*?(?=export const prisma|$)/)?.[0]??"")},
 ...legacy.map(path=>({name:`Legacy schema remains for compatibility: ${path}`,ok:/model\s+Tenant\s*\{/.test(read(path))}))
];
const failures=checks.filter(c=>!c.ok);
console.log(JSON.stringify({status:failures.length?"BLOCKED":"STATIC_CHECKS_PASS",checks,modelCount:models.length,warning:"Static checks do not prove database migration, runtime queries, or browser workflows."},null,2));
if(failures.length)process.exitCode=1;
