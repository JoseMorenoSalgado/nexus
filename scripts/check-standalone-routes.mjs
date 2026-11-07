#!/usr/bin/env node
/** Static contract for independent public routes and admin API. No DB writes. */
import {readFileSync} from "node:fs";
const read=p=>readFileSync(p,"utf8");
const home=read("src/app/page.tsx");
const catalog=read("src/app/propiedades/page.tsx");
const detail=read("src/app/propiedades/[slug]/page.tsx");
const api=read("src/app/api/standalone/manage/route.ts");
const layout=read("src/app/layout.tsx");
const adminLayout=read("src/app/admin/(panel)/layout.tsx");
const auth=read("src/lib/standalone/auth.ts");
const publicContext=read("src/lib/standalone/public-context.ts");
const standaloneRepositories=read("src/lib/standalone/repositories.ts");
const standaloneAdmin=read("src/app/standalone/admin/page.tsx");
const standaloneOperations=read("src/app/standalone/admin/operaciones/page.tsx");
const installer=read("src/app/instalar/page.tsx");
const db=read("src/lib/standalone/db.ts");
const checks=[
 ["Standalone metadata reads independent site config",layout.includes("getStandaloneSiteConfig()")],
 ["Legacy admin layout short circuits tenant lookup",adminLayout.indexOf('redirect("/standalone/admin")')<adminLayout.indexOf("const admin=await requireAdmin()")],
 ["Legacy installer routes to standalone installer",installer.includes('redirect("/standalone/instalar")')],
 ["Standalone public context reads standalone Prisma",publicContext.includes("standalonePrisma()")],
 ["Standalone repositories read standalone Prisma",standaloneRepositories.includes("standalonePrisma()")],
 ["Standalone dashboard requires independent auth",standaloneAdmin.includes("requireStandaloneRole(")],
 ["Standalone operations require independent auth",standaloneOperations.includes("requireStandaloneRole(")],
 ["Standalone public and admin modules do not reference tenantId",![publicContext,standaloneRepositories,standaloneAdmin,standaloneOperations].some(source=>/\\btenantId\\b/.test(source))],
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
