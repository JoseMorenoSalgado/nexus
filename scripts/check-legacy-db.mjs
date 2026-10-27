import assert from "node:assert/strict";
import {PrismaClient} from "@prisma/client";

const origin="http://localhost:3000";
const url=new URL(process.env.DATABASE_URL||"");
assert.equal(url.hostname,"127.0.0.1","Legacy DB test must only run against local CI database.");
assert.ok(url.pathname.includes("_ci"),"Legacy DB test must never modify a production database.");
const db=new PrismaClient();
try{
 // Deliberately reproduce an installation before the optional commercial-agent migrations.
 await db.$executeRawUnsafe("DROP TABLE IF EXISTS `LeadAssignmentHistory`");
 await db.$executeRawUnsafe("ALTER TABLE `Lead` DROP FOREIGN KEY `Lead_assignedAgentId_fkey`");
 await db.$executeRawUnsafe("ALTER TABLE `Lead` DROP INDEX `Lead_tenantId_assignedAgentId_createdAt_idx`");
 await db.$executeRawUnsafe("ALTER TABLE `Lead` DROP COLUMN `assignedAgentId`");
 await db.$executeRawUnsafe("ALTER TABLE `Property` DROP FOREIGN KEY `Property_assignedAgentId_fkey`");
 await db.$executeRawUnsafe("ALTER TABLE `Property` DROP INDEX `Property_assignedAgentId_idx`");
 await db.$executeRawUnsafe("ALTER TABLE `Property` DROP COLUMN `assignedAgentId`");
}finally{await db.$disconnect();}
async function get(path,cookie){
 return fetch(origin+path,{headers:cookie?{Cookie:cookie}:{},redirect:"manual"});
}
async function post(path,form,cookie){
 return fetch(origin+path,{method:"POST",body:form,headers:{Origin:origin,...(cookie?{Cookie:cookie}:{})},redirect:"manual"});
}
const homepage=await get("/");
assert.equal(homepage.status,200,"Public homepage must survive unmigrated agent columns.");
assert.match(await homepage.text(),/NEXUS/);
assert.equal((await get("/propiedades")).status,200,"Public catalog must survive unmigrated columns.");
const publicLead=await fetch(origin+"/api/leads",{method:"POST",
 headers:{Origin:origin,"Content-Type":"application/json"},
 body:JSON.stringify({name:"Cliente esquema heredado",phone:"88887777",consent:"yes",message:"Solicitud de prueba."})});
assert.equal(publicLead.status,201,"Public inquiry must still be recorded in legacy schema.");
const auth=new FormData();
auth.set("email",process.env.ADMIN_EMAIL);
auth.set("password",process.env.ADMIN_PASSWORD);
const login=await post("/api/admin/session",auth);
assert.equal(login.status,303);
const cookie=login.headers.getSetCookie().find(c=>c.startsWith("webappecloud_session="))?.split(";")[0];
assert.ok(cookie);
const adminHome=await get("/admin",cookie);
assert.equal(adminHome.status,200,"Dashboard must display recovery instead of throwing.");
assert.match(await adminHome.text(),/Actualización pendiente de la base de datos/);
const status=await get("/admin/sistema",cookie);
assert.equal(status.status,200);
const before=await status.text();
assert.match(before,/Completar estructura comercial/);
const refused=await post("/api/admin/sistema/reparar",new FormData(),cookie);
assert.match(refused.headers.get("location")||"",/status=failed/);
const confirm=new FormData();
confirm.set("backupConfirmed","yes");
const repaired=await post("/api/admin/sistema/reparar",confirm,cookie);
assert.equal(repaired.status,303);
assert.match(repaired.headers.get("location")||"",/status=repaired/);
assert.equal((await get("/")).status,200);
const refreshed=await get("/admin",cookie);
assert.equal(refreshed.status,200);
assert.ok(!(await refreshed.text()).includes("Actualización pendiente de la base de datos"));
const after=await (await get("/admin/sistema",cookie)).text();
assert.match(after,/Actualizado/);
// Re-running the fixed additive schema reconciliation must be safe (no duplicate columns/indexes).
const second=await post("/api/admin/sistema/reparar",confirm,cookie);
assert.match(second.headers.get("location")||"",/status=repaired/);
console.log("Legacy MariaDB recovery: site and leads work before migration; admin repairs schema without deleting records.");
