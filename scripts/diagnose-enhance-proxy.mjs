/** Read-only runtime diagnostics for Enhance Node.js proxy. */
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { createConnection } from 'node:net';

const port = Number(process.env.PORT || 3000);
const host = '127.0.0.1';
const checks = [
  ['Node.js >=22', Number(process.versions.node.split('.')[0]) >= 22],
  ['Production build exists', existsSync(resolve('.next/BUILD_ID'))],
  ['Port is valid', Number.isInteger(port) && port > 0 && port <= 65535],
];
for (const [name, ok] of checks) console.log(`${ok ? 'OK' : 'FAIL'}: ${name}`);
if (checks.some(([, ok]) => !ok)) process.exitCode = 1;
else {
  const socket = createConnection({ host, port });
  socket.setTimeout(3000);
  socket.once('connect', () => {
    console.log(`OK: TCP backend reachable at ${host}:${port}`);
    socket.end();
  });
  socket.once('error', (error) => {
    console.error(`FAIL: backend not reachable at ${host}:${port} (${error.code || error.message})`);
    process.exitCode = 1;
  });
  socket.once('timeout', () => {
    console.error('FAIL: backend TCP connection timed out');
    process.exitCode = 1;
    socket.destroy();
  });
}
