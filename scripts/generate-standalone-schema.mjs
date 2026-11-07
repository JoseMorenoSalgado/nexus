import {readFileSync,writeFileSync} from "node:fs";
import {resolve} from "node:path";

/**
 * Generate a NEW-install-only standalone schema.
 * Does not change the active Prisma schemas or an existing database.
 */
const input=resolve("prisma/schema.postgres.prisma");
const output=resolve("prisma/schema.standalone.postgres.prisma");
let source=readFileSync(input,"utf8");
source=source.replace('output = "../src/generated/postgres"','output = "../src/generated/standalone-postgres"');
source=source.replace(/model (?:Tenant|Domain) \{[\s\S]*?^\}/gm,"");
source=source.replace(/^\s*tenantId String(?:\?)?[^\n]*\n/gm,"");
source=source.replace(/^\s*tenant Tenant[^\n]*\n/gm,"");
source=source.replace(/^\s*@@index\(\[tenantId[^\n]*\n/gm,"");
source=source.replace(/^\s*@@unique\(\[tenantId,\s*([^\]]+)\]\)/gm,"  @@unique([$1])");
source=source.replace(/^\s*@@index\(\[tenantId,\s*([^\]]+)\]\)/gm,"  @@index([$1])");
source=source.replace(/model PropertySequence \{[\s\S]*?^\}/m,`model PropertySequence {
  id String @id @default("main")
  prefix String @default("NRE")
  nextNumber Int @default(1)
  updatedAt DateTime @updatedAt
}`);
source=source.replace(/(model AdminUser \{[\s\S]*?)(\n\})/m,(full,body,end)=>body.replace(/^\s*@@unique\(\[email\]\)/m,"  @@unique([email])")+end);
source+=`
model SiteConfig {
  id String @id @default("main")
  name String
  tagline String?
  whatsapp String?
  contactEmail String?
  logoUrl String?
  primaryColor String @default("#CB2027")
  updatedAt DateTime @updatedAt
}
`;
if(/\bmodel Tenant\b|\bmodel Domain\b|\btenantId\b|\btenant Tenant\b/.test(source)){
 throw new Error("Standalone schema still contains multitenant declarations");
}
writeFileSync(output,source);
console.log("Generated",output);
