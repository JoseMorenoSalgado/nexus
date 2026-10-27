import {spawnSync} from "node:child_process";
import {resolve} from "node:path";

const prisma=resolve("node_modules/prisma/build/index.js");
for(const [schema,url] of [
 ["prisma/schema.prisma","mysql://build:build@127.0.0.1:3306/build"],
 ["prisma/schema.postgres.prisma","postgresql://build:build@127.0.0.1:5432/build"]
]){
 const r=spawnSync(process.execPath,[prisma,"generate","--schema",schema],{
  stdio:"inherit",env:{...process.env,DATABASE_URL:url}
 });
 if(r.error){console.error(r.error);process.exit(1);}
 if(r.status!==0)process.exit(r.status||1);
}
