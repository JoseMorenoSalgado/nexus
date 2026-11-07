#!/usr/bin/env node
/** Static contract for independent public routes and admin API. No DB writes. */
import {readFileSync} from "node:fs";
const read=p=>readFileSync(p,"utf8");
const home=read("src/app/page.tsx");
const catalog=read("src/app/propiedades/page.tsx");
const detail=read("src/app/propiedades/[slug]/page.tsx");
const api=read("src/app/api/standalone/manage/route.ts");
const auth=read("src/lib/standalone/auth.ts");
const db=read("src/lib/standalone/db.ts");
const checks=[
 ["Canonical home renders standalone content",home.includes("<StandaloneHome/>")],
 ["Canonical catalog renders standalone content",catalog.includes("<StandaloneCatalog")],
 ["Canonical property detail renders standalone content",detail.includes("<StandaloneProperty")],
 ["Standalone API uses standalone Prisma",api.includes("standalonePrisma()")],
 ["Standalone API checks session",api.includes("currentStandaloneAdmin()")],
 ["Standalone API checks origin",api.includes("validOrigin(request)")],
 ["Standalone session uses standalone Prisma",auth.includes("standalonePrisma().adminSession")],
 ["Standalone DB uses generated PostgreSQL client",db.includes("generated/standalone-postgres")],
 ["No tenant references in standalone API",!/\btenantId\b|\bgetPublicContext\b|\bgetPrisma\b/.test(api)]
];
for(const [name,ok] of checks)console.log(`${ok?"PASS":"FAIL"} ${name}`);
if(checks.some(([,ok])=>!ok))process.exitCode=1;
console.log("Static checks only. Browser CRUD and production DB remain unverified.");
