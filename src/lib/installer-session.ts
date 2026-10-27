import "server-only";
import {createHash, randomBytes, timingSafeEqual} from "node:crypto";
import {closeSync, existsSync, mkdirSync, openSync, readFileSync, unlinkSync, writeFileSync} from "node:fs";
import {join} from "node:path";
import {configDir, installerAvailable} from "@/lib/server-config";

export const INSTALLER_SESSION_COOKIE = "wec_setup_session";
export const INSTALLER_SESSION_SECONDS = 60 * 60;
type Claim = {version: 1; tokenHash: string; expiresAt: number};

function claimPath(){return join(configDir(), "installer-session.json");}
function digest(token: string){return createHash("sha256").update(token).digest("hex");}
function readClaim(): Claim | null {
 try {
  const claim = JSON.parse(readFileSync(claimPath(), "utf8")) as Claim;
  return claim.version === 1 && /^[a-f0-9]{64}$/.test(claim.tokenHash) && Number.isFinite(claim.expiresAt) ? claim : null;
 } catch {return null;}
}
export function automaticInstallerEnabled(){
 return process.env.INSTALLER_AUTO_SETUP === "true";
}
export function validInstallerSession(token: string | undefined){
 if (!installerAvailable() || !automaticInstallerEnabled() || !token || !/^[a-f0-9]{64}$/.test(token)) return false;
 const claim = readClaim();
 if (!claim || claim.expiresAt <= Date.now()) return false;
 return timingSafeEqual(Buffer.from(claim.tokenHash, "hex"), Buffer.from(digest(token), "hex"));
}
/**
 * Only the first browser can claim the time-limited install session.
 * This is explicitly opt-in: NEVER enable INSTALLER_AUTO_SETUP on an unattended public site.
 */
export function issueInstallerSession(): string | null {
 if (!installerAvailable() || !automaticInstallerEnabled()) return null;
 mkdirSync(configDir(), {recursive:true, mode:0o700});
 // Serialize claims so simultaneous visitors cannot overwrite the first session.
 const lockPath=join(configDir(), ".installer-session.lock");
 let fd:number;
 try {fd=openSync(lockPath, "wx", 0o600);}
 catch(error){
  if (error instanceof Error && "code" in error && error.code === "EEXIST") return null;
  throw error;
 }
 try {
  const previous=readClaim();
  if (previous && previous.expiresAt > Date.now()) return null;
  const path=claimPath();
  if (existsSync(path)) unlinkSync(path);
  const token=randomBytes(32).toString("hex");
  const claim:Claim={version:1, tokenHash:digest(token), expiresAt:Date.now()+INSTALLER_SESSION_SECONDS*1000};
  writeFileSync(path, JSON.stringify(claim), {flag:"wx", mode:0o600});
  return token;
 } finally {
  closeSync(fd);
  unlinkSync(lockPath);
 }
}
export function clearInstallerSession(){
 const path = claimPath();
 if (existsSync(path)) unlinkSync(path);
}
