/** Reject legacy hosting references in active source and deployment configuration. */
import {readdirSync,readFileSync,statSync} from "node:fs";
import {join,relative} from "node:path";
const root=process.cwd();
const skipDirs=new Set([".git",".next","node_modules","coverage","dist","build",".runtime"]);
const skipFiles=new Set(["docs/NEXUS-CLIENT-ACCEPTANCE.md","scripts/check-no-plesk.mjs"]);
const extensions=/\.(?:ts|tsx|js|jsx|mjs|cjs|json|ya?ml|md|sh|example)$/i;
const forbidden=/\bplesk\b|\bpassenger\b|\bhttpdocs\b|\bsw-engine\b|check:plesk|plesk-server/ig;
const found=[];
function walk(dir){
 for(const item of readdirSync(dir,{withFileTypes:true})){
  if(item.isDirectory()){if(!skipDirs.has(item.name))walk(join(dir,item.name));continue;}
  if(!item.isFile())continue;
  const path=join(dir,item.name),rel=relative(root,path).replaceAll("\\","/");
  if(skipFiles.has(rel)||!extensions.test(item.name))continue;
  const source=readFileSync(path,"utf8");
  forbidden.lastIndex=0;
  if(forbidden.test(source))found.push(rel);
 }
}
walk(root);
if(found.length){console.error("Referencias de hosting antiguo pendientes:\n"+found.join("\n"));process.exitCode=1;}
else console.log("OK: no quedan referencias operativas al hosting anterior.");
