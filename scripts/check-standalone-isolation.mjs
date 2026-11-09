#!/usr/bin/env node
// CI guard: standalone modules must never depend on tenant-aware data access.
// Does not claim that all legacy routes have been migrated.
import {readdir,readFile} from "node:fs/promises";
import {join,relative} from "node:path";
const root=process.cwd();
const roots=["src/app/admin/standalone","src/app/api/admin/standalone","src/app/api/standalone","src/lib/prisma-standalone.ts","src/lib/property-reference.ts","src/lib/property-agent.ts","src/lib/standalone","src/app/standalone"];
const violations=[];
let files=0;
async function walk(dir){
 let entries;
 try{entries=await readdir(dir,{withFileTypes:true});}catch(e){if(e?.code==="ENOENT")return;throw e;}
 for(const entry of entries){
  const path=join(dir,entry.name);
  if(entry.isDirectory()){await walk(path);continue;}
  if(!entry.isFile()||!/[.]tsx?$/.test(entry.name))continue;
  files++;
  const source=await readFile(path,"utf8");
  const lines=source.split(/\r?\n/);
  for(let i=0;i<lines.length;i++){
   const line=lines[i];
   const reasons=[];
   if(/\btenantId\b|\b(?:getTenant|resolveTenant|requireTenant|currentTenant|tenantModuleEnabled|singleInstallationTenantId)\b/.test(line))reasons.push("tenant context");
   if(/from\s*["']@\/lib\/(?:prisma|tenant(?!-modules-registry["'])[^"']*|single-installation|commercial-schema|closing-schema|commission-schema|crm-schema)["']/.test(line))reasons.push("legacy tenant service import");
   if(/\b(?:db|prisma)\.(?:tenant|domain)\b/.test(line))reasons.push("tenant/domain database access");
   if(reasons.length)violations.push({file:relative(root,path),line:i+1,reasons});
  }
 }
}
for(const dir of roots){if(/\.[cm]?[jt]sx?$/.test(dir)){const source=await readFile(join(root,dir),"utf8");files++;for(const [i,line] of source.split(/\r?\n/).entries()){const reasons=[];if(/\b(?:tenantModuleEnabled|singleInstallationTenantId|resolveTenant|requireTenant)\b/.test(line))reasons.push("tenant context");if(/\b(?:db|prisma)\.(?:tenant|domain)\b/.test(line))reasons.push("tenant/domain database access");if(reasons.length)violations.push({file:dir,line:i+1,reasons});}}else await walk(join(root,dir));}
console.log(JSON.stringify({checkedFiles:files,violations},null,2));
if(!files){console.error("No standalone modules found");process.exitCode=1;}
if(violations.length)process.exitCode=1;
