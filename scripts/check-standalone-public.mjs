// Real HTTP/SQL regression on an explicitly disposable, empty local database.
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,dirname} from 'node:path';
import {randomUUID,randomBytes,scryptSync} from 'node:crypto';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import sharp from 'sharp';
import {PDFDocument} from 'pdf-lib';

const url=new URL(process.env.DATABASE_URL||'');
assert.equal(process.env.NEXUS_STANDALONE_TEST_DB,'true','Explicit disposable database opt-in required');
assert.ok(['localhost','127.0.0.1'].includes(url.hostname),'Only local test SQL is allowed');
assert.match(url.pathname,/^\/nexus_standalone_test(?:_[a-z0-9]+)?$/,'Use a dedicated test database');
const {PrismaClient}=await import(url.protocol.startsWith('postgres')?'../src/generated/postgres/index.js':'@prisma/client');
const db=new PrismaClient();
assert.equal(await db.tenant.count(),0,'Test database must be empty');
const config=await mkdtemp(join(tmpdir(),'nexus-standalone-test-'));
const port=Number(process.env.STANDALONE_TEST_PORT||3108);
const origin='http://localhost:'+port;
const publicHost='nexus.public.test';
const proxy={Host:'127.0.0.1:'+port,'X-Forwarded-Host':publicHost,'X-Forwarded-Proto':'https'};
const email='admin@standalone.test',password='Only-for-disposable-tests-12345';
let server,logs='',checks=0;
const ownedTenants=[];
async function save(path,bytes){await mkdir(dirname(path),{recursive:true});await writeFile(path,bytes);}
async function stop(){
 if(server&&server.exitCode===null){const exited=once(server,'exit');server.kill('SIGTERM');await exited;}
 server=undefined;
}
async function start(siteUrl=''){
 await stop();logs='';
 const env={...process.env,NODE_ENV:'production',APP_CONFIG_DIR:config,SITE_URL:siteUrl,APP_URL:'',NEXT_PUBLIC_SITE_URL:'',SITE_PREVIEW_MODE:'false'};
 server=spawn(process.execPath,['node_modules/next/dist/bin/next','start','-H','127.0.0.1','-p',String(port)],{env,stdio:['ignore','pipe','pipe']});
 server.stdout.on('data',x=>logs+=x);server.stderr.on('data',x=>logs+=x);
 for(let i=0;i<100;i++){
  if(server.exitCode!==null)throw Error('Test server exited: '+logs);
  try{if((await fetch(origin+'/api/live')).ok)return;}catch{}
  await new Promise(r=>setTimeout(r,200));
 }
 throw Error('Test server did not become ready: '+logs);
}
async function request(path,status=200,headers=proxy,options={}){
 const res=await fetch(origin+path,{...options,headers:{...headers,...options.headers},redirect:'manual'});
 assert.equal(res.status,status,path+' returned '+res.status+' expected '+status+'\n'+logs.slice(-1200));checks++;return res;
}
async function login(){
 const form=new FormData();form.set('email',email);form.set('password',password);
 const res=await request('/api/admin/session',303,proxy,{method:'POST',headers:{Origin:'https://'+publicHost},body:form});
 const cookie=res.headers.getSetCookie().find(c=>c.startsWith('webappecloud_session='));
 assert.ok(cookie,'Authenticated session cookie missing');
 return cookie.split(';')[0];
}
try{
 await start();
 await request('/',404); // zero organizations must fail closed
 const tenant=await db.tenant.create({data:{name:'Standalone regression Nexus',slug:'standalone-test',tagline:'Content shared with dashboard'}});
 ownedTenants.push(tenant.id);
 const salt=randomBytes(16).toString('hex');
 await db.adminUser.create({data:{tenantId:tenant.id,name:'Test admin',email,role:'admin',passwordHash:'scrypt$'+salt+'$'+scryptSync(password,salt,64).toString('hex')}});
 const photoId=randomUUID(),imageId=randomBytes(16).toString('hex');
 const property=await db.property.create({data:{tenantId:tenant.id,slug:'test-property',refCode:'TEST-001',title:'Public test property',description:'Disposable content',city:'Managua',type:'Casa',operation:'venta',price:100,published:true,photos:{create:{id:photoId,url:'/api/media/'+photoId}}}});
 const page=await db.sitePage.create({data:{tenantId:tenant.id,slug:'pagina-test-page',title:'Standalone custom page',published:true,blocks:{body:'Visible page content',sections:[{id:'section-image',type:'image',imageId,alt:'Test photograph',caption:''}]}}});
 await db.sitePage.create({data:{tenantId:tenant.id,slug:'asesoria-empresarial',title:'Asesoría empresarial',published:true,blocks:{}}});
 const bytes=await sharp({create:{width:32,height:32,channels:3,background:'#cf202b'}}).webp().toBuffer();
 await save(join(config,'site-media',tenant.id,'logo.webp'),bytes);
 await save(join(config,'media',tenant.id,photoId+'.webp'),bytes);
 await save(join(config,'page-images',tenant.id,'test-page',imageId+'.webp'),bytes);
 const pdf=await PDFDocument.create();pdf.addPage();
 await save(join(config,'property-documents',tenant.id,property.id+'.pdf'),await pdf.save());
 const routes=['/','/nosotros','/servicios','/contacto','/propiedades','/asesoria-empresarial','/pagina/test-page','/propiedades/test-property','/api/site-media/logo','/api/media/'+photoId,'/api/site-page-images/test-page/'+imageId,'/api/propiedades/test-property/pdf','/api/propiedades/test-property/pdf-personalizado'];
 // No SITE_URL and NO Domain rows: this failed before the standalone resolver.
 for(const path of routes)await request(path);
 const html=await (await request('/')).text();assert.ok(html.includes(tenant.name));
 const cookie=await login();
 await request('/admin',200,{...proxy,Cookie:cookie});
 const diagnostic=await (await request('/admin/sistema/diagnostico',200,{...proxy,Cookie:cookie})).text();
 assert.match(diagnostic,/El sitio público carga la misma organización/);
 await request('/admin',307);
 await request('/admin/sistema/diagnostico',307);
 // Old installation's INTERNAL domain must not hide public content either.
 await db.domain.create({data:{tenantId:tenant.id,hostname:'127.0.0.1'}});
 for(const path of routes)await request(path);
 for(const headers of [{Host:publicHost},{Host:'enhance-upstream.internal:3000'},{Host:publicHost,'X-Forwarded-Host':'foreign.test'}])await request('/',200,headers);
 // Published flags still protect drafts and their media/PDFs.
 await db.property.update({where:{id:property.id},data:{published:false}});
 for(const path of ['/propiedades/test-property','/api/media/'+photoId,'/api/propiedades/test-property/pdf','/api/propiedades/test-property/pdf-personalizado'])await request(path,404);
 await db.property.update({where:{id:property.id},data:{published:true}});
 await db.sitePage.update({where:{id:page.id},data:{published:false}});
 await request('/pagina/test-page',404);await request('/api/site-page-images/test-page/'+imageId,404);
 await db.sitePage.update({where:{id:page.id},data:{published:true}});
 // All public entrypoints reject disabled/ambiguous installations.
 await db.tenant.update({where:{id:tenant.id},data:{active:false}});
 for(const path of routes)await request(path,404);
 await db.tenant.update({where:{id:tenant.id},data:{active:true}});
 const second=await db.tenant.create({data:{name:'Second organization',slug:'must-not-select'}});ownedTenants.push(second.id);
 for(const path of routes)await request(path,404);
 await request('/admin',307,{...proxy,Cookie:cookie});
 await db.tenant.delete({where:{id:second.id}});
 // Both unset and explicit canonical URL: real browser posts through Enhance.
 for(const configured of ['', 'https://'+publicHost]){
  await start(configured);
  for(const path of routes)await request(path);
  for(const path of ['/api/leads','/api/events']){
   const body=JSON.stringify(path.endsWith('leads')?{name:'Test Visitor',phone:'88887777',consent:'yes',propertyId:property.id}:{kind:'view',path:'/'});
   const options={method:'POST',body,headers:{'Content-Type':'application/json',Origin:'https://'+publicHost}};
   await request(path,201,proxy,options);
   await request(path,403,proxy,{...options,headers:{...options.headers,Origin:'https://attacker.invalid'}});
   await request(path,403,proxy,{...options,headers:{...options.headers,'Sec-Fetch-Site':'cross-site'}});
   await request(path,403,proxy,{...options,headers:{'Content-Type':'application/json'}});
   if(configured)await request(path,201,{...proxy,'X-Forwarded-Host':'www.'+publicHost},{...options,headers:{...options.headers,Origin:'https://www.'+publicHost}});
  }
 }
 assert.equal(await db.lead.count({where:{tenantId:tenant.id}}),3);
 assert.equal(await db.visitEvent.count({where:{tenantId:tenant.id}}),3);
 await start('not-a-valid-url');
 await request('/'); // Bad canonical URL must not hide published content.
 await request('/api/events',403,proxy,{method:'POST',headers:{Origin:'https://'+publicHost,'Content-Type':'application/json'},body:'{"kind":"view","path":"/"}'});
 console.log(`Standalone public regression passed: ${checks} HTTP checks; no/stale domains, proxy, pages, media, PDFs, dashboard, publication, multi-organization denial and form origins.`);
}finally{
 await stop();
 for(const id of ownedTenants.reverse())await db.tenant.deleteMany({where:{id}});
 await db.$disconnect();
 await rm(config,{recursive:true,force:true});
}
