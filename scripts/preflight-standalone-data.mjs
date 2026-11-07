#!/usr/bin/env node
/**
 * Read-only preflight for migrating legacy PostgreSQL data to a separate,
 * empty standalone PostgreSQL database. No writes or schema changes.
 * Supply SOURCE_DATABASE_URL and TARGET_DATABASE_URL privately.
 */
import {PrismaClient as Legacy} from "../src/generated/postgres/index.js";
import {PrismaClient as Standalone} from "../src/generated/standalone-postgres/index.js";

const sourceUrl=process.env.SOURCE_DATABASE_URL;
const targetUrl=process.env.TARGET_DATABASE_URL;
function identity(value){
 const u=new URL(value);
 if(!["postgres:","postgresql:"].includes(u.protocol))throw new Error("PostgreSQL URL required");
 return {host:u.hostname.toLowerCase(),port:u.port||"5432",database:decodeURIComponent(u.pathname.slice(1))};
}
if(!sourceUrl||!targetUrl)throw new Error("Set SOURCE_DATABASE_URL and TARGET_DATABASE_URL");
const sourceId=identity(sourceUrl),targetId=identity(targetUrl);
if(JSON.stringify(sourceId)===JSON.stringify(targetId))throw new Error("Source and target must be different databases");
const source=new Legacy({datasources:{db:{url:sourceUrl}}});
const target=new Standalone({datasources:{db:{url:targetUrl}}});
const tables=["adminUser","property","photo","lead","leadCrm","leadNote","leadAssignmentHistory","leadPropertyHistory","agendaEvent","commercialClosing","commissionPayment"];
const counts=async db=>{
 const result={};
 for(const table of tables)result[table]=await db[table].count();
 return result;
};
try{
 const [origin,destination]=await Promise.all([counts(source),counts(target)]);
 const [slugs,refs,emails]=await Promise.all([
  source.property.groupBy({by:["slug"],_count:{_all:true},having:{slug:{_count:{gt:1}}}}),
  source.property.groupBy({by:["refCode"],_count:{_all:true},having:{refCode:{_count:{gt:1}}}}),
  source.adminUser.groupBy({by:["email"],_count:{_all:true},having:{email:{_count:{gt:1}}}})
 ]);
 const duplicates={slugs:slugs.length,refCodes:refs.length,emails:emails.length};
 const occupied=Object.values(destination).some(n=>n!==0);
 const ready=!occupied&&Object.values(duplicates).every(n=>n===0);
 console.log(JSON.stringify({status:ready?"READY_FOR_STAGING_COPY":"BLOCKED",source:origin,target:destination,duplicates,warning:"READ ONLY: does not copy records. Requires verified backup and staging rehearsal before any production change."},null,2));
 if(!ready)process.exitCode=1;
}catch(error){
 console.error("Migration preflight failed:",error instanceof Error?error.message:String(error));
 process.exitCode=1;
}finally{
 await Promise.allSettled([source.$disconnect(),target.$disconnect()]);
}
