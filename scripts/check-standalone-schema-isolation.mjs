#!/usr/bin/env node
// Static guard: the production standalone schema must not reintroduce tenant/domain models or columns.
import {readFile} from "node:fs/promises";
const schema=await readFile("prisma/schema.standalone.postgres.prisma","utf8");
const withoutComments=schema.replace(/\/\*[\s\S]*?\*\//g,"").replace(/^\s*\/\/.*$/gm,"");
const violations=[];
for(const [label,pattern] of [
 ["Tenant/Domain model",/^\s*model\s+(?:Tenant|Domain)\s*\{/gm],
 ["tenantId field",/^\s*tenantId\s+/gm],
 ["tenant relation",/^\s*(?:tenant|domain)\s+(?:Tenant|Domain)\b/gm],
 ["legacy tenant index",/@@(?:index|unique|id)\s*\(\s*\[\s*tenantId\b/gm]
]){
 if(pattern.test(withoutComments))violations.push(label);
}
if(violations.length){console.error("Standalone schema isolation failed:",violations.join(", "));process.exitCode=1;}
else console.log("Standalone PostgreSQL schema has no tenant/domain models or tenantId fields.");
