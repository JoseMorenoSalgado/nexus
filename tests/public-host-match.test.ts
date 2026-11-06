import {strict as assert} from "node:assert";
import {test} from "node:test";
import {isAllowedPublicHost} from "../src/lib/public-site/host-match";
test("canonical and www share the same public site",()=>{
 assert.equal(isAllowedPublicHost("www.nexusrealestatenicaragua.com","https://nexusrealestatenicaragua.com",[]),true);
 assert.equal(isAllowedPublicHost("nexusrealestatenicaragua.com","https://www.nexusrealestatenicaragua.com",[]),true);
});
test("foreign domains are never authorized",()=>{
 assert.equal(isAllowedPublicHost("evil.example","https://nexusrealestatenicaragua.com",[]),false);
});
test("registered domains work only without SITE_URL",()=>{
 assert.equal(isAllowedPublicHost("nexusrealestatenicaragua.com","",["nexusrealestatenicaragua.com"]),true);
 assert.equal(isAllowedPublicHost("evil.example","",["nexusrealestatenicaragua.com"]),false);
});
test("invalid canonical origins are rejected",()=>{
 assert.equal(isAllowedPublicHost("nexusrealestatenicaragua.com","http://nexusrealestatenicaragua.com",[]),false);
});
