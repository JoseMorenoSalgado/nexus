/**
 * Build a Prisma v6 installer connection string without leaking credentials.
 * Local PostgreSQL sockets are explicitly allowlisted. The installer cannot
 * be used to reach arbitrary Unix socket paths.
 */
export type InstallerDbEngine = "mysql" | "postgresql";
export type InstallerDbInput = {
  engine: InstallerDbEngine;
  host: string;
  port: number;
  dbName: string;
  dbUser: string;
  dbPassword: string;
};

const allowedPostgresSocketDirs = new Set(["/var/run/postgresql", "/run/postgresql"]);

export function buildInstallerDatabaseUrl({engine,host,port,dbName,dbUser,dbPassword}: InstallerDbInput): string {
  const endpoint = host.trim().toLowerCase();
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("Servidor o puerto de base de datos inválido.");
  }
  if (!/^[a-zA-Z0-9_-]{1,64}$/.test(dbName)) {
    throw new Error("Nombre de base de datos inválido.");
  }
  if (!/^[a-zA-Z0-9_@.-]{1,80}$/.test(dbUser) || !dbPassword || dbPassword.length > 256) {
    throw new Error("Revisa el usuario y contraseña de la base de datos.");
  }
  const socket = endpoint.startsWith("/");
  if (socket) {
    const clean = endpoint.endsWith("/") ? endpoint.slice(0, -1) : endpoint;
    if (engine !== "postgresql" || !allowedPostgresSocketDirs.has(clean)) {
      throw new Error("Socket PostgreSQL no autorizado. En Enhance usa /var/run/postgresql.");
    }
    const user = encodeURIComponent(dbUser);
    const password = encodeURIComponent(dbPassword);
    // Prisma expects an absolute Unix socket directory in the host query parameter.
    // Percent-encoding the path can make libpq/Prisma treat it as a literal host.
    const dir = clean;
    return `postgresql://${user}:${password}@localhost:${port}/${dbName}?host=${dir}`;
  }
  if (!/^[a-z0-9][a-z0-9.-]*$/.test(endpoint) || endpoint.length > 250 || endpoint.includes("..")) {
    throw new Error("Servidor o puerto de base de datos inválido.");
  }
  const protocol = engine === "postgresql" ? "postgresql" : "mysql";
  const user = encodeURIComponent(dbUser);
  const password = encodeURIComponent(dbPassword);
  return `${protocol}://${user}:${password}@${endpoint}:${port}/${dbName}`;
}
