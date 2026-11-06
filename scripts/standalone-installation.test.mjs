import assert from "node:assert/strict";
import { test } from "node:test";
import { validateStandaloneSnapshot } from "../src/lib/standalone-installation.ts";
const valid = {
 activeOrganizationIds:["nexus"],
 domainOrganizationId:"nexus",
 domainOrganizationActive:true,
 adminOrganizationId:"nexus",
};
test("accepts one organization with matching domain and administrator",()=>{
 assert.equal(validateStandaloneSnapshot(valid),"nexus");
});
test("rejects empty or ambiguous active organizations",()=>{
 assert.equal(validateStandaloneSnapshot({...valid,activeOrganizationIds:[]}),null);
 assert.equal(validateStandaloneSnapshot({...valid,activeOrganizationIds:["nexus","other"]}),null);
});
test("rejects foreign or inactive domain",()=>{
 assert.equal(validateStandaloneSnapshot({...valid,domainOrganizationId:"other"}),null);
 assert.equal(validateStandaloneSnapshot({...valid,domainOrganizationActive:false}),null);
});
test("rejects missing or foreign administrator",()=>{
 assert.equal(validateStandaloneSnapshot({...valid,adminOrganizationId:null}),null);
 assert.equal(validateStandaloneSnapshot({...valid,adminOrganizationId:"other"}),null);
});
