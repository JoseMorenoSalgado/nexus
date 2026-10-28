#!/usr/bin/env node
/**
 * NEXUS production SQL diagnostics. READ ONLY: this script never runs db push,
 * seed, migrate, DELETE, ALTER, CREATE, or any other write statement.
 * Run inside the actual NEXUS app container, not another client container.
 *
 * Optional: RECOVERY_HOST=nexusrealestatenicaragua.com
 */
import {existsSync, readFileSync} from "node:fs";
import {resolve, join} from "node:path";

function fail(message) {
  console.error("[NEXUS-DB] " + message);
  process.exitCode = 1;
}
function installationConfig() {
  const dir = resolve(process.env.APP_CONFIG_DIR || join(process.cwd(), ".runtime"));
  const filename = join(dir, "installation.json");
  if (!existsSync(filename)) return null;
  try {
    const stored = JSON.parse(readFileSync(filename, "utf8"));
    if (stored.version !== 1 || typeof stored.databaseUrl !== "string" || !stored.databaseUrl) {
      throw new Error("invalid");
    }
    return stored;
  } catch {
    throw new Error("El archivo persistente installation.json no es válido.");
  }
}

let db;
try {
  const installed = installationConfig();
  const url = installed?.databaseUrl || (process.env.DATABASE_URL || "").trim();
  if (!url) {
    fail("Sin conexión SQL configurada. Comprueba APP_CONFIG_DIR y DATABASE_URL.");
  } else {
    const protocol = new URL(url).protocol.toLowerCase();
    const engine = protocol === "mysql:" ? "mysql"
      : ["postgres:", "postgresql:"].includes(protocol) ? "postgresql" : null;
    if (!engine) throw new Error("El protocolo SQL no es compatible.");
    console.log("[NEXUS-DB] Configuración activa: " + (installed ? "installation.json" : "DATABASE_URL"));
    console.log("[NEXUS-DB] Motor: " + engine + ". No se muestran host, usuario ni contraseña.");

    const module = engine === "mysql"
      ? await import("@prisma/client")
      : await import("../src/generated/postgres/index.js");
    db = new module.PrismaClient({datasources: {db: {url}}, log: []});
    await db.$queryRaw`SELECT 1`;
    console.log("[NEXUS-DB] Conexión SQL: correcta.");

    const results = engine === "mysql"
      ? await db.$queryRaw`SELECT TABLE_NAME AS name FROM information_schema.tables WHERE table_schema = DATABASE() AND table_type = 'BASE TABLE'`
      : await db.$queryRaw`SELECT tablename AS name FROM pg_catalog.pg_tables WHERE schemaname = current_schema()`;
    const tables = new Set(results.map(row => String(row.name)));
    const critical = ["Tenant", "Domain", "SitePage", "Property", "Photo", "AdminUser", "AdminSession"];
    const missing = critical.filter(name => !tables.has(name));
    console.log("[NEXUS-DB] Tablas SQL detectadas: " + tables.size + ".");
    if (missing.length) {
      fail("Esquema incompleto. Tablas esenciales ausentes: " + missing.join(", ") + ".");
      if (tables.size === 0) console.log("[NEXUS-DB] La base parece vacía. Instala únicamente después de confirmar que esta es la base prevista.");
      else console.log("[NEXUS-DB] Hay tablas existentes. Conserva los datos y reconcilia el esquema solo tras verificar un respaldo.");
    } else {
      console.log("[NEXUS-DB] Tablas esenciales: presentes.");
      const host = String(process.env.RECOVERY_HOST || "").trim().toLowerCase().replace(/:\d+$/, "").replace(/\.$/, "");
      if (host) {
        if (!/^[a-z0-9][a-z0-9.-]*$/.test(host)) throw new Error("RECOVERY_HOST inválido.");
        const domain = await db.domain.findUnique({where: {hostname: host}, select: {tenantId: true, tenant: {select: {active: true}}}});
        if (!domain || !domain.tenant.active) fail("Dominio sin empresa activa asociada en esta base: " + host + ".");
        else console.log("[NEXUS-DB] Dominio y empresa activa: correctos.");
      }
      if (!process.exitCode) console.log("[NEXUS-DB] Diagnóstico SQL básico: correcto. Verifica /api/health y la web pública.");
    }
  }
} catch (error) {
  // Prisma/driver errors can contain credentials. Never print error.message.
  const code = error && typeof error === "object" && "code" in error ? String(error.code) : "";
  fail("No se pudo completar el diagnóstico. Código: " + (/^P\d{4}$/.test(code) ? code : "CONFIG_OR_CONNECTION") + ".");
} finally {
  if (db) {
    try { await db.$disconnect(); }
    catch { fail("No se pudo cerrar limpiamente la conexión de diagnóstico."); }
  }
}
