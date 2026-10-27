import { createHash, timingSafeEqual } from "node:crypto";

export type SnapshotEntry = {
  path: string;
  sha256: string;
  bytes: number;
};
export type SnapshotManifest = {
  schemaVersion: 1;
  snapshotId: string;
  createdAt: string;
  appVersion: string;
  database: SnapshotEntry;
  files: SnapshotEntry[];
};

const HEX_SHA256 = /^[a-f0-9]{64}$/;
const ID = /^[a-zA-Z0-9_-]{8,80}$/;
const VERSION = /^\\d+\\.\\d+\\.\\d+(?:-[a-zA-Z0-9.-]+)?$/;

/** Reject absolute paths, traversal and public URLs in backup metadata. */
export function validRelativeSnapshotPath(path: unknown): path is string {
  if (typeof path !== "string" || path.length < 1 || path.length > 512 || path.includes("\\") || path.startsWith("/")) return false;
  if (path.includes("://") || path.includes("\0")) return false;
  return path.split("/").every(segment => segment !== "" && segment !== "." && segment !== "..");
}

function validEntry(entry: unknown): entry is SnapshotEntry {
  if (!entry || typeof entry !== "object") return false;
  const item = entry as Partial<SnapshotEntry>;
  return validRelativeSnapshotPath(item.path) && typeof item.sha256 === "string" &&
    HEX_SHA256.test(item.sha256) && typeof item.bytes === "number" &&
    Number.isSafeInteger(item.bytes) && item.bytes >= 0;
}

export function validateSnapshotManifest(input: unknown): SnapshotManifest {
  if (!input || typeof input !== "object") throw new Error("Invalid snapshot metadata");
  const value = input as Partial<SnapshotManifest>;
  if (value.schemaVersion !== 1 || typeof value.snapshotId !== "string" || !ID.test(value.snapshotId) ||
      typeof value.createdAt !== "string" || !Number.isFinite(Date.parse(value.createdAt)) ||
      typeof value.appVersion !== "string" || !VERSION.test(value.appVersion) ||
      !validEntry(value.database) || !Array.isArray(value.files) ||
      value.files.length > 10000 || !value.files.every(validEntry)) {
    throw new Error("Invalid snapshot metadata");
  }
  const paths = [value.database.path, ...value.files.map(file => file.path)];
  if (new Set(paths).size !== paths.length) throw new Error("Duplicate snapshot entry");
  return value as SnapshotManifest;
}

export function verifySnapshotContent(content: Buffer, entry: SnapshotEntry): boolean {
  if (content.length !== entry.bytes) return false;
  const digest = createHash("sha256").update(content).digest();
  const expected = Buffer.from(entry.sha256, "hex");
  return expected.length === digest.length && timingSafeEqual(digest, expected);
}
