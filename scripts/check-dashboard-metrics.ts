import assert from "node:assert/strict";
import {firstDayOfSeries,makeDailyMetrics} from "../src/lib/dashboard-metrics";

const now=new Date("2026-10-22T12:00:00.000Z");
assert.equal(firstDayOfSeries(3,now).toISOString(),"2026-10-20T00:00:00.000Z");
const events=[
 {kind:"view",createdAt:new Date("2026-10-20T10:00:00Z")},
 {kind:"view",createdAt:new Date("2026-10-20T18:00:00Z")},
 {kind:"whatsapp",createdAt:new Date("2026-10-21T23:59:00Z")},
 {kind:"view",createdAt:new Date("2026-10-19T23:59:00Z")}
];
const leads=[{createdAt:new Date("2026-10-20T19:00:00Z")},{createdAt:new Date("2026-10-22T01:00:00Z")}];
const metrics=makeDailyMetrics(events,leads,3,now);
assert.equal(metrics.length,3);
assert.deepEqual(metrics.map(({visitas,leads,whatsapp})=>({visitas,leads,whatsapp})),[
 {visitas:2,leads:1,whatsapp:0},{visitas:0,leads:0,whatsapp:1},{visitas:0,leads:1,whatsapp:0}
]);
assert.equal(makeDailyMetrics([],[],0,now).length,1);
assert.equal(makeDailyMetrics([],[],200,now).length,90);
console.log("Dashboard metrics: agrupación UTC, conteos y límites verificados.");
