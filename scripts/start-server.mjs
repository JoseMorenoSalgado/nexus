/** Portable Next.js production startup for Enhance and local hosts. */
import { spawn, spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { loadEnvFile } from 'node:process';
import { homedir } from 'node:os';
import { resolve, join } from 'node:path';

// Enhance may place .env in the deployment root or a private persistent
// directory. Discover it at startup, before Next.js is spawned. Never
// override variables supplied by the hosting environment.
const initialEnv = { ...process.env };
const home = homedir();
const explicitDir = initialEnv.APP_CONFIG_DIR?.trim();
const candidates = [
  ...(explicitDir ? [resolve(explicitDir, '.env')] : []),
  resolve('.env.production'),
  resolve('.env'),
  join(home, 'nexus-runtime-new', '.env'),
  join(home, 'nexus-runtime', '.env'),
];
let loadedFrom = null;
for (const candidate of candidates) {
  if (!existsSync(candidate)) continue;
  try {
    // Keep the first matching file as the single source of application settings.
    loadEnvFile(candidate);
    for (const [key, value] of Object.entries(initialEnv)) process.env[key] = value;
    loadedFrom = candidate;
    if (!initialEnv.APP_CONFIG_DIR && candidate === join(home, 'nexus-runtime-new', '.env')) {
      process.env.APP_CONFIG_DIR = join(home, 'nexus-runtime-new');
    }
    break;
  } catch (error) {
    console.error('Cannot load Nexus environment file:', error.message);
    process.exit(1);
  }
}
const siteUrl = process.env.SITE_URL?.trim() || '';
let canonicalValid = false;
try {
  const url = new URL(siteUrl);
  canonicalValid = url.protocol === 'https:' && !url.username && !url.password &&
    url.pathname === '/' && !url.search && !url.hash && !url.port;
} catch {}
console.log('Nexus runtime environment:', loadedFrom ? 'file loaded' : 'no .env file discovered');
console.log('Nexus canonical SITE_URL:', canonicalValid ? new URL(siteUrl).hostname : 'MISSING OR INVALID');
if (!canonicalValid) console.warn('Public pages may return 404 until SITE_URL is set to the canonical HTTPS domain.');

const port = Number(process.env.PORT || 3000);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  console.error('Invalid PORT. Set an integer from 1 to 65535.');
  process.exit(1);
}
if (!existsSync(resolve('.next/BUILD_ID'))) {
  console.error('Missing production build (.next/BUILD_ID). Run npm run build in the active deployment.');
  process.exit(1);
}
const nextCli = resolve('node_modules/next/dist/bin/next');
if (!existsSync(nextCli)) {
  console.error('Next.js is not installed in this deployment. Run npm install.');
  process.exit(1);
}
// Explicit, opt-in, idempotent repair for a misregistered Enhance proxy domain.
// Never run a database mutation merely because a new deployment started.
if (process.env.NEXUS_REPAIR_PUBLIC_DOMAIN === 'true') {
  if (!process.env.SITE_URL || !process.env.ADMIN_EMAIL) {
    console.error('Domain repair requires SITE_URL and ADMIN_EMAIL.');
    process.exit(1);
  }
  const tsx = resolve('node_modules/tsx/dist/cli.mjs');
  if (!existsSync(tsx)) {
    console.error('Domain repair requires tsx. Install deployment dependencies first.');
    process.exit(1);
  }
  const repair = spawnSync(process.execPath, [tsx, 'scripts/repair-public-domain.ts'], {
    stdio: 'inherit', env: process.env, timeout: 30000
  });
  if (repair.error || repair.status !== 0) {
    console.error('Domain repair failed; refusing to start with an unverified tenant association.');
    process.exit(1);
  }
}
console.log(`Starting Nexus on 0.0.0.0:${port}`);
const child = spawn(process.execPath, [nextCli, 'start', '-H', '0.0.0.0', '-p', String(port)], { stdio: 'inherit', env: process.env });
for (const signal of ['SIGTERM', 'SIGINT']) process.on(signal, () => child.kill(signal));
child.on('error', error => { console.error('Unable to start Next.js:', error.message); process.exitCode = 1; });
child.on('exit', (code, signal) => { process.exitCode = code ?? (signal ? 1 : 0); });
