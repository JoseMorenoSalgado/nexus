/**
 * Smoke test the exact Passenger-compatible entry point deployed on Plesk.
 * Runs against CI's temporary SQL and bound localhost port; never production.
 */
import assert from "node:assert/strict";
import {spawn} from "node:child_process";
import {resolve} from "node:path";
import {setTimeout as sleep} from "node:timers/promises";

const root=resolve(".");
const port=3004;
const origin="http://127.0.0.1:"+port;
const child=spawn(process.execPath,[resolve(root,"app.js")],{
 cwd:root,
 env:{...process.env,NODE_ENV:"production",PORT:String(port)},
 stdio:["ignore","pipe","pipe"]
});
let logs="";
for(const stream of [child.stdout,child.stderr]){
 stream?.on("data",chunk=>{logs=(logs+chunk.toString()).slice(-4500);});
}
try{
 let ready=false;
 for(let i=0;i<50;i++){
  if(child.exitCode!==null)break;
  try{
   const response=await fetch(origin+"/api/live",{signal:AbortSignal.timeout(1500)});
   if(response.ok){
    const data=await response.json();
    assert.equal(data.status,"online");
    assert.equal(data.service,"nexus");
    ready=true;break;
   }
  }catch{}
  await sleep(300);
 }
 assert.ok(ready,"Passenger app.js could not start: "+logs.slice(-1300));
 const htmlResponse=await fetch(origin+"/",{headers:{Host:"localhost:"+port},signal:AbortSignal.timeout(10000)});
 assert.equal(htmlResponse.status,200,"SSR homepage status");
 const html=await htmlResponse.text();
 assert.match(html,/NEXUS/i,"Missing rendered Nexus page");
 const files=[...html.matchAll(/(?:src|href)="(\/_next\/static\/[^"]+\.(?:js|css)(?:\?[^"]*)?)"/g)]
  .map(match=>match[1].replaceAll("&amp;","&"));
 assert.ok(files.some(s=>s.includes(".js")),"SSR HTML has no Next.js JS asset");
 assert.ok(files.some(s=>s.includes(".css")),"SSR HTML has no Next.js CSS asset");
 for(const asset of [...new Set(files)].slice(0,6)){
  const response=await fetch(origin+asset,{signal:AbortSignal.timeout(10000)});
  assert.equal(response.status,200,"Bundled asset not served: "+asset);
  assert.ok(Number(response.headers.get("content-length")||0)>0||((await response.arrayBuffer()).byteLength>0));
 }
 const health=await fetch(origin+"/api/health",{signal:AbortSignal.timeout(10000)});
 assert.equal(health.status,200,"Prisma readiness failed");
 const db=await health.json();
 assert.equal(db.status,"ok");
 console.log("PASS Plesk app.js: Node startup, SSR home, Next.js JS/CSS, Prisma health.");
}catch(error){
 console.error("Plesk startup smoke failed:",error instanceof Error?error.message:"unknown");
 console.error("Last startup logs:",logs.slice(-1300));
 process.exitCode=1;
}finally{
 child.kill("SIGTERM");
 await Promise.race([new Promise(resolve=>child.once("exit",resolve)),sleep(2000)]);
 if(child.exitCode===null)child.kill("SIGKILL");
}
