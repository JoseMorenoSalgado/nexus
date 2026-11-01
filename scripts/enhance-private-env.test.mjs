import test from "node:test";
import assert from "node:assert/strict";
import {mkdtempSync,readFileSync,statSync,existsSync,rmSync,mkdirSync,writeFileSync} from "node:fs";
import {tmpdir} from "node:os";
import {join,resolve} from "node:path";
import {spawnSync} from "node:child_process";

test("Enhance private env is safe, persistent and installation is opt-in",()=>{
 const root=mkdtempSync(join(tmpdir(),"nexus-enhance-test-"));
 const dir=join(root,"private");
 const script=resolve("scripts/enhance-private-env.mjs");
 const run=(command,extra={})=>spawnSync(process.execPath,[script,command],{
  cwd:process.cwd(),encoding:"utf8",
  env:{...process.env,APP_CONFIG_DIR:dir,NEXUS_INSTALLER_ACCESS_RESTRICTED:"",...extra}
 });
 try{
  let r=run("init");
  assert.equal(r.status,0,r.stderr);
  const file=join(dir,"enhance.env");
  assert.ok(existsSync(file));
  assert.equal(statSync(file).mode&0o077,0);
  assert.match(readFileSync(file,"utf8"),/INSTALLER_AUTO_SETUP=false/);
  r=run("enable");
  assert.notEqual(r.status,0,"installer must not enable without explicit acknowledgement");
  r=run("enable",{NEXUS_INSTALLER_ACCESS_RESTRICTED:"yes"});
  assert.equal(r.status,0,r.stderr);
  assert.match(readFileSync(file,"utf8"),/INSTALLER_AUTO_SETUP=true/);
  r=run("init");
  assert.equal(r.status,0,r.stderr);
  assert.match(readFileSync(file,"utf8"),/INSTALLER_AUTO_SETUP=true/,"init must not overwrite existing private config");
  r=run("disable");
  assert.equal(r.status,0,r.stderr);
  assert.match(readFileSync(file,"utf8"),/INSTALLER_AUTO_SETUP=false/);
  writeFileSync(join(dir,"installation.json"),'{"version":1}',{mode:0o600});
  r=run("enable",{NEXUS_INSTALLER_ACCESS_RESTRICTED:"yes"});
  assert.notEqual(r.status,0,"installed site must reject reactivation");
 }finally{rmSync(root,{recursive:true,force:true});}
});
