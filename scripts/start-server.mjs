/** Portable Next.js production startup for Enhance and local hosts. */
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

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
console.log(`Starting Nexus on 0.0.0.0:${port}`);
const child = spawn(process.execPath, [nextCli, 'start', '-H', '0.0.0.0', '-p', String(port)], { stdio: 'inherit', env: process.env });
for (const signal of ['SIGTERM', 'SIGINT']) process.on(signal, () => child.kill(signal));
child.on('error', error => { console.error('Unable to start Next.js:', error.message); process.exitCode = 1; });
child.on('exit', (code, signal) => { process.exitCode = code ?? (signal ? 1 : 0); });
