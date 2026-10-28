import assert from "node:assert/strict";
const origin=process.env.TEST_ORIGIN||"http://localhost:3000";
assert.equal(new URL(origin).hostname,"localhost","Security tests must run only against ephemeral localhost");
async function send(path:string,body:string,extra:Record<string,string>={}){
 return fetch(origin+path,{method:"POST",headers:{"Content-Type":"application/json",Origin:origin,...extra},body});
}
const oversizedLead=await send("/api/leads",JSON.stringify({name:"Prueba",phone:"88887777",consent:"yes",message:"X".repeat(9000)}));
assert.equal(oversizedLead.status,413,"Public lead requests must have a strict body cap");
const oversizedEvent=await send("/api/events",JSON.stringify({kind:"view",path:"/"+ "x".repeat(2000)}));
assert.equal(oversizedEvent.status,413,"Analytics requests must have a strict body cap");
for(const path of ["/api/leads","/api/events"]){
 const response=await send(path,path==="/api/events"?JSON.stringify({kind:"view",path:"/"}):JSON.stringify({name:"Prueba",phone:"88887777",consent:"yes"}),{"Sec-Fetch-Site":"cross-site"});
 assert.equal(response.status,403,"Cross-site browser writes must be rejected: "+path);
}
assert.equal((await send("/api/events",'{"kind":"view","path":"/"}')).status,201,"Same-origin telemetry must remain operational");
console.log("NEXUS public API security: byte limits, cross-site rejection and valid telemetry verified.");
