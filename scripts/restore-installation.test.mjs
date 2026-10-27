import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,readFileSync,existsSync,statSync,rmSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {restoreInstallation} from './restore-installation.mjs';

for(const scheme of ['mysql','postgresql']) {
 test(`restore ${scheme} preserves existing database and creates private config`,async()=>{
  const directory=mkdtempSync(join(tmpdir(),'recovery-test-'));
  let disconnected=false;
  const count=async()=>0;
  try {
   const url=`${scheme}://test:test@localhost/test`;
   await restoreInstallation({url,host:'Example.com:443',directory,createClient:async()=>({
    domain:{findUnique:async({where})=>{assert.equal(where.hostname,'example.com');return {tenantId:'t',tenant:{active:true}};}},
    adminUser:{findFirst:async()=>({id:'a'})},property:{count},photo:{count},adminSession:{count},adminLoginThrottle:{count},$disconnect:async()=>{disconnected=true;}
   })});
   assert.equal(JSON.parse(readFileSync(join(directory,'installation.json'))).databaseUrl,url);
   assert.equal(statSync(join(directory,'installation.json')).mode&0o777,0o600);
   assert.equal(disconnected,true);
   assert.equal(existsSync(join(directory,'.installer.lock')),false);
  } finally {rmSync(directory,{recursive:true,force:true});}
 });
}
for(const scenario of ['wrong-domain','no-admin','missing-table','existing-config','locked']) {
 test(`restore refuses ${scenario} without replacing data`,async()=>{
  const directory=mkdtempSync(join(tmpdir(),'recovery-test-'));
  const target=join(directory,'installation.json');
  if(scenario==='existing-config')writeFileSync(target,'original');
  if(scenario==='locked')writeFileSync(join(directory,'.installer.lock'),'');
  const count=async()=>{if(scenario==='missing-table')throw Error('missing table');return 0;};
  try {
   await assert.rejects(restoreInstallation({url:'mysql://test:test@localhost/test',host:'example.com',directory,createClient:async()=>({
    domain:{findUnique:async()=>scenario==='wrong-domain'?null:{tenantId:'t',tenant:{active:true}}},
    adminUser:{findFirst:async()=>scenario==='no-admin'?null:{id:'a'}},property:{count},photo:{count},adminSession:{count},adminLoginThrottle:{count},$disconnect:async()=>{}
   })}));
   if(scenario==='existing-config')assert.equal(readFileSync(target,'utf8'),'original');
   else assert.equal(existsSync(target),false);
   assert.equal(existsSync(join(directory,'.installer.lock')),scenario==='locked');
  } finally {rmSync(directory,{recursive:true,force:true});}
 });
}
