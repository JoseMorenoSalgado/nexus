#!/usr/bin/env node
// Inventario de referencias multitenant. Solo lectura, sin conexiones a BD.
import { readdir, readFile } from 'node:fs/promises';
import { join, relative, extname } from 'node:path';

const root = process.cwd();
const excluded = new Set(['.git', '.next', 'node_modules', 'coverage', 'dist', 'build', '.turbo']);
const extensions = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.prisma', '.sql']);
const checks = [
  ['tenantId', /\btenantId\b/g],
  ['Tenant', /\bTenant\b/g],
  ['Domain', /\bDomain\b/g],
  ['tenant context', /\b(?:resolveTenant|getTenant|requireTenant|tenantContext|currentTenant)\b/g],
];
const matches = [];
async function walk(dir) {
  for (const item of await readdir(dir, { withFileTypes: true })) {
    if (excluded.has(item.name)) continue;
    const path = join(dir, item.name);
    if (item.isDirectory()) { await walk(path); continue; }
    if (!item.isFile() || !extensions.has(extname(item.name))) continue;
    const lines = (await readFile(path, 'utf8')).split(/\r?\n/);
    for (let i = 0; i < lines.length; i++) {
      const kinds = checks.filter(([, pattern]) => { pattern.lastIndex = 0; return pattern.test(lines[i]); }).map(([name]) => name);
      if (kinds.length) matches.push({ file: relative(root, path), line: i + 1, kinds });
    }
  }
}
await walk(root);
const counts = Object.fromEntries(checks.map(([name]) => [name, matches.filter(m => m.kinds.includes(name)).length]));
console.log(JSON.stringify({ totalMatchingLines: matches.length, counts, matches }, null, 2));
if (process.argv.includes('--fail-on-references') && matches.length) process.exitCode = 1;
