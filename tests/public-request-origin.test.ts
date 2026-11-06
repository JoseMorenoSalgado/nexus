import {test} from "node:test";
import {strict as assert} from "node:assert";
import {publicPageHostname,publicRequestHostname,validPublicMutationOrigin} from "../src/lib/public-request-origin";

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
test("configured SITE_URL ignores proxy forwarded host when browser Origin matches",()=>{
 const h=headers({Host:"127.0.0.1:3000",Origin:"https://nexus.example",
  "X-Forwarded-Host":"attacker.invalid","X-Forwarded-Proto":"https"});
 const pinned={...env,SITE_URL:"https://nexus.example"};
 assert.equal(validPublicMutationOrigin(h,pinned),true);
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

test("pinned HTTPS origin is accepted behind Enhance non-private upstream Host",()=>{
 const pinned={...env,SITE_URL:"https://nexus.example"};
 const h=headers({Host:"enhance-upstream.internal:3000",Origin:"https://nexus.example",
  "X-Forwarded-Host":"nexus.example","X-Forwarded-Proto":"https"});
 assert.equal(validPublicMutationOrigin(h,pinned),true);
 assert.equal(validPublicMutationOrigin(headers({Host:"enhance-upstream.internal:3000",Origin:"https://attacker.invalid"}),pinned),false);
});

test("login referer fallback is same-origin and limited to access page",()=>{
 const pinned={...env,SITE_URL:"https://nexus.example"};
 assert.equal(validPublicMutationOrigin(headers({Host:"internal",Referer:"https://nexus.example/admin/acceso?error=origen"}),pinned),true);
 assert.equal(validPublicMutationOrigin(headers({Host:"internal",Referer:"https://evil.example/admin/acceso"}),pinned),false);
 assert.equal(validPublicMutationOrigin(headers({Host:"internal",Referer:"https://nexus.example/evil"}),pinned),false);
 assert.equal(validPublicMutationOrigin(headers({Host:"internal"}),pinned),false);
});

test("public pages recover canonical domain from Enhance service host",()=>{
 const pinned={...env,SITE_URL:"https://nexus.example"};
 const h=headers({Host:"enhance-upstream.internal:3000","X-Forwarded-Host":"nexus.example","X-Forwarded-Proto":"https"});
 assert.equal(publicPageHostname(h,pinned),"nexus.example");
 assert.equal(publicRequestHostname(h,pinned),null);
});
test("public recovery rejects mismatched or insecure forwarded hosts",()=>{
 const pinned={...env,SITE_URL:"https://nexus.example"};
 assert.equal(publicPageHostname(headers({Host:"upstream.internal","X-Forwarded-Host":"attacker.invalid","X-Forwarded-Proto":"https"}),pinned),null);
 assert.equal(publicPageHostname(headers({Host:"upstream.internal","X-Forwarded-Host":"nexus.example","X-Forwarded-Proto":"http"}),pinned),null);
});
