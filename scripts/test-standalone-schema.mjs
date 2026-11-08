#!/usr/bin/env node
// Static contract for the independent PostgreSQL schema; no database connection.
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const schema = readFileSync(new URL('../prisma/schema.standalone.postgres.prisma', import.meta.url), 'utf8');
assert.match(schema, /provider\s*=\s*"postgresql"/);
for (const name of ['Property','Lead','AdminUser','SitePage','SiteConfig','PropertySequence']) {
  assert.match(schema, new RegExp('\\bmodel\\s+' + name + '\\s*\\{'), 'Missing model ' + name);
}
assert.doesNotMatch(schema, /\bmodel\s+(Tenant|Domain)\s*\{/);
assert.doesNotMatch(schema, /\btenantId\b/);
assert.match(schema, /@@unique\(\[slug\]\)/);
assert.match(schema, /@@unique\(\[email\]\)/);
console.log('Standalone PostgreSQL schema static contract: PASS');
