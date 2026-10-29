import assert from "node:assert/strict";
import {mkdtempSync,readFileSync,readdirSync,rmSync,statSync} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {integrationsForTenant,saveIntegrations,smtpValid,captchaValid} from "../src/lib/integration-config";

const root=mkdtempSync(join(tmpdir(),"nexus-config-test-"));
const old=process.env.APP_CONFIG_DIR;
try{
 process.env.APP_CONFIG_DIR=root;
 const original=integrationsForTenant("tenant-a");
 assert.equal(original.smtp.enabled,false);
 const cfg={
  smtp:{enabled:true,host:"smtp.example.org",port:587 as const,user:"mailer",
   password:"PRIVATE-SMTP-PASSWORD",from:"mail@example.org",to:"office@example.org"},
  captcha:{enabled:true,siteKey:"public-site-key",secretKey:"PRIVATE-CAPTCHA-SECRET"}
 };
 assert.ok(smtpValid(cfg.smtp));
 assert.ok(captchaValid(cfg.captcha));
 saveIntegrations("tenant-a",cfg);
 const key=join(root,".integrations-key");
 const folder=join(root,"integrations");
 assert.equal(statSync(key).mode&0o077,0,"Key must not be world-readable");
 const [file]=readdirSync(folder);
 assert.ok(!file.includes("tenant-a"),"Tenant ID should not be exposed in file name");
 const disk=readFileSync(join(folder,file),"utf8");
 assert.ok(!disk.includes(cfg.smtp.password)&&!disk.includes(cfg.captcha.secretKey),"Do not store unencrypted secrets.");
 assert.equal(statSync(join(folder,file)).mode&0o077,0);
 assert.deepEqual(integrationsForTenant("tenant-a"),cfg);
 assert.equal(integrationsForTenant("tenant-b").smtp.enabled,false,"Tenants must be isolated.");
 const updated={...cfg,smtp:{...cfg.smtp,enabled:false}};
 saveIntegrations("tenant-a",updated);
 assert.equal(integrationsForTenant("tenant-a").captcha.secretKey,cfg.captcha.secretKey);
 assert.equal(integrationsForTenant("tenant-a").smtp.enabled,false);
 console.log("Integrations: AES-GCM persistence, private 0600 files and tenant isolation passed.");
}finally{
 if(old===undefined)delete process.env.APP_CONFIG_DIR;else process.env.APP_CONFIG_DIR=old;
 rmSync(root,{recursive:true,force:true});
}
