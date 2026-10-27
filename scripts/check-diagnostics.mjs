import assert from "node:assert/strict";
const origin=process.env.TEST_ORIGIN||"http://localhost:3000";
assert.equal(new URL(origin).hostname,"localhost","Never query a production deployment from CI.");
const response=await fetch(origin+"/api/diagnostico",{redirect:"manual"});
assert.equal(response.status,200,"The seeded CI domain and SQL connection must both be ready.");
const data=await response.json();
assert.equal(data.service,"nexus");
assert.equal(data.status,"ready");
assert.equal(data.checks.configuration,"present");
assert.equal(data.checks.database,"connected");
assert.equal(data.checks.domain,"registered");
assert.ok(!JSON.stringify(data).includes("DATABASE_URL"));
assert.equal(response.headers.get("cache-control")?.includes("no-store"),true);

const health=await fetch(origin+"/api/health",{redirect:"manual"});
assert.equal(health.status,200,"A seeded NEXUS database with Domain table must be healthy.");
assert.deepEqual(await health.json(),{status:"ok"});
console.log("NEXUS diagnostic: configured SQL connection and registered hostname passed.");
