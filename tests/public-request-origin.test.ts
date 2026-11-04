import {test} from "node:test";
import {strict as assert} from "node:assert";
import {publicRequestHostname,validPublicMutationOrigin} from "../src/lib/public-request-origin";

const headers=(values:Record<string,string>)=>new Headers(values);
const env={SITE_URL:undefined,APP_URL:undefined,NEXT_PUBLIC_SITE_URL:undefined};

test("direct HTTPS requests validate their exact origin and resolve tenant",()=>{
 const h=headers({Host:"nexus.example",Origin:"https://nexus.example"});
 assert.equal(validPublicMutationOrigin(h,env),true);
 assert.equal(publicRequestHostname(h,env),"nexus.example");
});
test("Enhance private upstream accepts matching HTTPS forwarded host",()=>{
 const h=headers({Host:"127.0.0.1:3000",Origin:"https://nexus.example",
  "X-Forwarded-Host":"nexus.example","X-Forwarded-Proto":"https"});
 assert.equal(validPublicMutationOrigin(h,env),true);
 assert.equal(publicRequestHostname(h,env),"nexus.example");
});
test("explicit SITE_URL allows HTTPS through private upstream without forwarded host",()=>{
 const h=headers({Host:"127.0.0.1:3000",Origin:"https://nexus.example"});
 const pinned={...env,SITE_URL:"https://nexus.example/"};
 assert.equal(validPublicMutationOrigin(h,pinned),true);
 assert.equal(publicRequestHostname(h,pinned),"nexus.example");
});
test("configured SITE_URL forbids spoofed or contradictory forwarded host",()=>{
 const h=headers({Host:"127.0.0.1:3000",Origin:"https://nexus.example",
  "X-Forwarded-Host":"attacker.invalid","X-Forwarded-Proto":"https"});
 const pinned={...env,SITE_URL:"https://nexus.example"};
 assert.equal(validPublicMutationOrigin(h,pinned),false);
 assert.equal(publicRequestHostname(h,pinned),null);
});
test("reject cross-site Origin even with trusted proxy forwarding",()=>{
 const h=headers({Host:"127.0.0.1:3000",Origin:"https://evil.example",
  "X-Forwarded-Host":"nexus.example","X-Forwarded-Proto":"https"});
 assert.equal(validPublicMutationOrigin(h,env),false);
});
test("reject forged forwarded host on a public Host",()=>{
 const h=headers({Host:"evil.example",Origin:"https://nexus.example",
  "X-Forwarded-Host":"nexus.example","X-Forwarded-Proto":"https"});
 assert.equal(validPublicMutationOrigin(h,env),false);
 assert.equal(publicRequestHostname(h,env),"evil.example");
});
test("reject insecure public Origin and forwarded HTTP",()=>{
 assert.equal(validPublicMutationOrigin(headers({Host:"nexus.example",Origin:"http://nexus.example"}),env),false);
 const h=headers({Host:"127.0.0.1:3000",Origin:"https://nexus.example",
  "X-Forwarded-Host":"nexus.example","X-Forwarded-Proto":"http"});
 assert.equal(validPublicMutationOrigin(h,env),false);
});
test("reject malformed or missing Origin and malformed configuration",()=>{
 assert.equal(validPublicMutationOrigin(headers({Host:"nexus.example"}),env),false);
 assert.equal(validPublicMutationOrigin(headers({Host:"nexus.example",Origin:"https://nexus.example/path"}),env),false);
 const pinned={...env,SITE_URL:"http://nexus.example"};
 assert.equal(validPublicMutationOrigin(headers({Host:"nexus.example",Origin:"https://nexus.example"}),pinned),false);
});
test("preserve local CI login and tenant mapping",()=>{
 const h=headers({Host:"localhost:3000",Origin:"http://localhost:3000"});
 assert.equal(validPublicMutationOrigin(h,env),true);
 assert.equal(publicRequestHostname(h,env),"localhost");
});
test("public www and bare domains never become interchangeable",()=>{
 const h=headers({Host:"www.nexus.example",Origin:"https://nexus.example"});
 assert.equal(validPublicMutationOrigin(h,env),false);
});

const production={...env,NODE_ENV:"production"};
const official="https://nexusrealestatenicaragua.com";
test("production Enhance login needs no origin environment variables",()=>{
 for(const Host of ["127.0.0.1:3000","10.0.0.5:3000","nexusrealestatenicaragua.com"]){
  const h=headers({Host,Origin:official});
  assert.equal(validPublicMutationOrigin(h,production),true);
  assert.equal(publicRequestHostname(h,production),"nexusrealestatenicaragua.com");
 }
 assert.equal(publicRequestHostname(headers({Host:"127.0.0.1:3000"}),production),"nexusrealestatenicaragua.com");
});
test("production default rejects foreign, insecure, missing and contradictory origins",()=>{
 for(const Origin of ["https://evil.example","http://nexusrealestatenicaragua.com","https://www.nexusrealestatenicaragua.com","null"]){
  assert.equal(validPublicMutationOrigin(headers({Host:"127.0.0.1:3000",Origin}),production),false);
 }
 assert.equal(validPublicMutationOrigin(headers({Host:"127.0.0.1:3000"}),production),false);
 assert.equal(validPublicMutationOrigin(headers({Host:"evil.example",Origin:official}),production),false);
 assert.equal(validPublicMutationOrigin(headers({Host:"127.0.0.1:3000",Origin:official,"X-Forwarded-Host":"evil.example"}),production),false);
});
test("explicit production configuration takes precedence and invalid configuration fails closed",()=>{
 const h=headers({Host:"127.0.0.1:3000",Origin:"https://custom.example"});
 assert.equal(validPublicMutationOrigin(h,{...production,SITE_URL:"https://custom.example"}),true);
 assert.equal(validPublicMutationOrigin(headers({Host:"127.0.0.1:3000",Origin:official}),{...production,SITE_URL:"https://custom.example"}),false);
 assert.equal(validPublicMutationOrigin(h,{...production,SITE_URL:"http://custom.example"}),false);
});
