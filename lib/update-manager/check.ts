import "server-only";
import type { UpdateChannel, UpdateManifest, UpdateRelease } from "./types";

const MAX_MANIFEST_BYTES = 128 * 1024;
const VERSION = /^\\d+\\.\\d+\\.\\d+(?:-[0-9A-Za-z.-]+)?$/;

function compareVersions(a: string, b: string): number {
  const parse = (s: string) => s.split("-")[0].split(".").map(Number);
  const left = parse(a), right = parse(b);
  for (let i = 0; i < 3; i++) if (left[i] !== right[i]) return left[i] > right[i] ? 1 : -1;
  return a.includes("-") === b.includes("-") ? 0 : a.includes("-") ? -1 : 1;
}

/** Read-only discovery. Never downloads or executes update packages. */
export async function checkForUpdates(currentVersion: string, channel: UpdateChannel = "stable"): Promise<UpdateRelease[]> {
  if (!VERSION.test(currentVersion)) throw new Error("Invalid current version");
  const endpoint = process.env.WEBAPPECLOUD_UPDATE_MANIFEST_URL;
  if (!endpoint) throw new Error("Update service not configured");
  const url = new URL(endpoint);
  if (url.protocol !== "https:" || url.username || url.password) throw new Error("HTTPS update endpoint required");
  const response = await fetch(url, { cache: "no-store", redirect: "error", signal: AbortSignal.timeout(7000), headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error("Update service unavailable");
  if (Number(response.headers.get("content-length") || 0) > MAX_MANIFEST_BYTES) throw new Error("Manifest too large");
  const body = await response.text();
  if (Buffer.byteLength(body) > MAX_MANIFEST_BYTES) throw new Error("Manifest too large");
  const data: unknown = JSON.parse(body);
  if (!data || typeof data !== "object" || (data as UpdateManifest).schemaVersion !== 1 || !Array.isArray((data as UpdateManifest).releases)) throw new Error("Invalid update manifest");
  return (data as UpdateManifest).releases.filter(r =>
    r && typeof r.version === "string" && VERSION.test(r.version) &&
    ["stable", "beta"].includes(r.channel) && ["security", "bugfix", "performance", "feature"].includes(r.category) &&
    typeof r.title === "string" && typeof r.notes === "string" &&
    (channel === "beta" || r.channel === "stable") && compareVersions(r.version, currentVersion) > 0
  ).sort((a,b) => compareVersions(b.version,a.version));
}
