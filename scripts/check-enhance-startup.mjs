/**
 * Smoke test the exact Node-compatible entry point deployed on Enhance.
 * Runs against CI's temporary SQL and bound localhost port; never production.
 */
import assert from "node:assert/strict";
import {spawn} from "node:child_process";
import {resolve} from "node:path";
import {setTimeout as sleep} from "node:timers/promises";

const root=resolve(".");
const port=3004;
// Seeded CI tenant belongs to localhost; use the same Host for SSR routing.
const origin="http://localhost:"+port;
const child=spawn("npm",["start"],{
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
 assert.ok(ready,"Node npm start could not start: "+logs.slice(-1300));
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
 // Enhance regressions can affect nested login CSS while the homepage still works.
 // Validate the actual SSR login HTML and every referenced stylesheet.
 const loginResponse=await fetch(origin+"/admin/acceso?error=credenciales",{
  signal:AbortSignal.timeout(10000)
 });
 assert.equal(loginResponse.status,200,"Admin login page must be reachable without a session");
 const loginHtml=await loginResponse.text();
 assert.match(loginHtml,/data-nexus-login-critical="1"/,"Missing SSR fallback for admin login layout");
 assert.match(loginHtml,/\.login-page \.login-card/,"Critical login CSS not rendered in initial HTML");
 const loginCss=[...loginHtml.matchAll(/href="(\/_next\/static\/[^"]+\.css(?:\?[^"]*)?)"/g)]
  .map(match=>match[1].replaceAll("&amp;","&"));
 assert.ok(loginCss.length>0,"Admin login HTML has no Next.js stylesheet references");
 let containsLoginRules=false;
 for(const asset of [...new Set(loginCss)]){
  const response=await fetch(origin+asset,{signal:AbortSignal.timeout(10000)});
  assert.equal(response.status,200,"Admin login stylesheet returned an error: "+asset);
  assert.match(response.headers.get("content-type")||"",/text\/css/,"Invalid CSS MIME type: "+asset);
  const body=await response.text();
  assert.ok(body.length>100,"Empty admin login CSS chunk: "+asset);
  if(body.includes(".login-page")&&body.includes(".login-card"))containsLoginRules=true;
 }
 assert.ok(containsLoginRules,"Legacy login styling was not bundled for /admin/acceso");
 const health=await fetch(origin+"/api/health",{signal:AbortSignal.timeout(10000)});
 assert.equal(health.status,200,"Prisma readiness failed");
 const db=await health.json();
 assert.equal(db.status,"ok");
 console.log("PASS Enhance npm start: Node startup, SSR home, admin login styling, Next.js CSS/JS, Prisma health.");
}catch(error){
 console.error("Enhance startup smoke failed:",error instanceof Error?error.message:"unknown");
 console.error("Last startup logs:",logs.slice(-1300));
 process.exitCode=1;
}finally{
 child.kill("SIGTERM");
 await Promise.race([new Promise(resolve=>child.once("exit",resolve)),sleep(2000)]);
 if(child.exitCode===null)child.kill("SIGKILL");
}
