import {test} from "node:test";
import {strict as assert} from "node:assert";
import {buildInstallerDatabaseUrl as build} from "../src/lib/installer-db-url";

const base = {engine: "postgresql" as const,host: "/var/run/postgresql",port: 5432,
  dbName: "nexus_ci",dbUser: "nexus_admin",dbPassword: "p@ss/word?# "+"%"};

test("PostgreSQL local socket uses Prisma v6 host query parameter", () => {
  const url = build(base);
  const u = new URL(url);
  assert.equal(u.protocol, "postgresql:");
  assert.equal(u.hostname, "localhost");
  assert.equal(u.port, "5432");
  assert.equal(u.pathname, "/nexus_ci");
  assert.equal(u.searchParams.get("host"), "/var/run/postgresql");
  assert.equal(decodeURIComponent(u.password), base.dbPassword);
});

test("both standard local PostgreSQL socket paths are accepted", () => {
  const u = new URL(build({...base,host: "/run/postgresql"}));
  assert.equal(u.searchParams.get("host"), "/run/postgresql");
  assert.equal(new URL(build({...base,host: "/var/run/postgresql/"})).searchParams.get("host"), "/var/run/postgresql");
});

test("TCP PostgreSQL remains backward compatible", () => {
  assert.equal(build({...base,host: "db.example.test",port: 5544,dbPassword:"test"}),
    "postgresql://nexus_admin:test@db.example.test:5544/nexus_ci");
});

test("TCP MySQL / MariaDB remains unchanged", () => {
  assert.equal(build({...base,engine: "mysql",host: "127.0.0.1",port: 3306,dbPassword:"test"}),
    "mysql://nexus_admin:test@127.0.0.1:3306/nexus_ci");
});

test("rejects arbitrary Unix sockets, path traversal, injection and socket for MySQL", () => {
  for (const host of ["/tmp/postgresql", "/var/run/postgresql/../private", "/run/mysql", "db.example.test?host=/tmp", "a..b", "../../etc/passwd", ""]) {
    assert.throws(() => build({...base,host}), /Servidor o puerto|Socket PostgreSQL/, `host must be rejected: ${host}`);
  }
  assert.throws(() => build({...base,engine:"mysql"}), /Socket PostgreSQL no autorizado/);
});

test("invalid credentials and ports are rejected", () => {
  assert.throws(() => build({...base,port: 0}));
  assert.throws(() => build({...base,port: 65536}));
  assert.throws(() => build({...base,dbPassword: ""}));
  assert.throws(() => build({...base,dbUser:"bad@user:invalid"}));
});
