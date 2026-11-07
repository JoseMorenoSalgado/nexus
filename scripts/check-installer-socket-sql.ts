/**
 * Integration test for Prisma v6 over PostgreSQL Unix sockets.
 * MUST run only on a disposable CI environment, never against production.
 */
import {strict as assert} from "node:assert";
import {PrismaClient} from "../src/generated/postgres";
import {buildInstallerDatabaseUrl} from "../src/lib/installer-db-url";

if (process.env.CI !== "true") {
  throw Error("Socket SQL integration test is restricted to GitHub CI.");
}
const databaseUrl = buildInstallerDatabaseUrl({
  engine: "postgresql",
  host: "/var/run/postgresql",
  port: 5432,
  dbName: "nexus_socket_ci",
  dbUser: "nexus_socket_ci",
  dbPassword: "ci_socket_only_password"
});
async function main(){
const db = new PrismaClient({datasources:{db:{url:databaseUrl}}});
try {
  const rows=await db.$queryRaw<Array<{
    tables:bigint;
    can_connect:boolean;
    can_create:boolean;
    can_use:boolean;
  }>>`
    SELECT
      (SELECT COUNT(*) FROM information_schema.tables
        WHERE table_schema = 'public' AND table_type = 'BASE TABLE') AS tables,
      has_database_privilege(current_user,current_database(),'CONNECT') AS can_connect,
      has_schema_privilege(current_user,'public','CREATE') AS can_create,
      has_schema_privilege(current_user,'public','USAGE') AS can_use
  `;
  assert.equal(Number(rows[0]?.tables),0,"New installation DB must be empty");
  assert.equal(rows[0]?.can_connect,true);
  assert.equal(rows[0]?.can_create,true);
  assert.equal(rows[0]?.can_use,true);
  console.log("PASS: Prisma v6 connected through the actual PostgreSQL Unix socket, preflight returned valid privileges and empty schema.");
}finally{
  await db.$disconnect();
}
}
main().catch(error=>{
  const code=error && typeof error === 'object' && 'code' in error ? String(error.code) : 'unknown';
  const message=error instanceof Error ? error.message : String(error);
  const safeMessage=message.replace(/postgresql:\/\/[^\s]+/gi,'[database URL redacted]').replace(/ci_socket_only_password/g,'[redacted]');
  console.error('PostgreSQL socket integration failed:', {code,errorType:error instanceof Error ? error.name : 'unknown',message:safeMessage.slice(0,1200)});
  process.exitCode=1;
});
