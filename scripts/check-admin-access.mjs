// Authentication integration test on isolated localhost databases.
import assert from 'node:assert/strict';
const origin=process.env.TEST_ORIGIN||'http://localhost:3000';
assert.equal(new URL(origin).hostname,'localhost','Only an isolated localhost test server is allowed');
const page=await fetch(origin+'/admin/acceso');
assert.equal(page.status,200);
const html=await page.text();
assert.match(html,/action="\/api\/admin\/session"/,'Stable HTML login form missing');
async function csrfFor(headers={}){
 const response=await fetch(origin+'/api/admin/login-csrf',{headers,redirect:'manual'});
 assert.equal(response.status,200);
 const {token}=await response.json();
 assert.match(token,/^[a-f0-9]{64}$/);
 const cookie=response.headers.getSetCookie().find(c=>c.startsWith('nexus_admin_login_csrf='));
 assert.ok(cookie,'CSRF cookie missing');
 assert.match(cookie,/httponly/i);
 assert.match(cookie,/samesite=strict/i);
 return {token,cookie:cookie.split(';')[0]};
}
const csrf=await csrfFor();
const form=new FormData();
form.set("csrf_token",csrf.token);
form.set('email',process.env.ADMIN_EMAIL);
form.set('password',process.env.ADMIN_PASSWORD);
const login=await fetch(origin+'/api/admin/session',{
 method:'POST',headers:{Origin:origin,Cookie:csrf.cookie},body:form,redirect:'manual'
});
assert.equal(login.status,303);
assert.equal(new URL(login.headers.get('location'),origin).pathname,'/api/admin/session');
const cookie=login.headers.getSetCookie().find(c=>c.startsWith('webappecloud_session='));
assert.ok(cookie,'Session cookie missing');
assert.match(cookie,/httponly/i);
assert.match(cookie,/samesite=lax/i);
assert.match(cookie,/secure/i);
const cookieHeader=cookie.split(';')[0];
const check=await fetch(origin+'/api/admin/session',{headers:{Cookie:cookieHeader},redirect:'manual'});
assert.equal(check.status,303);
assert.equal(new URL(check.headers.get('location'),origin).pathname,'/admin');
const authenticated=await fetch(origin+'/admin',{headers:{Cookie:cookieHeader},redirect:'manual'});
assert.equal(authenticated.status,200,'Dashboard must load after sign-in');
const anonymous=await fetch(origin+'/admin',{redirect:'manual'});
assert.equal(anonymous.status,307);
assert.equal(new URL(anonymous.headers.get('location'),origin).pathname,'/admin/acceso');
const noCookie=await fetch(origin+'/api/admin/session',{redirect:'manual'});
assert.equal(noCookie.status,303);
assert.equal(new URL(noCookie.headers.get('location'),origin).searchParams.get('error'),'sesion');
const integrations=await fetch(origin+'/admin/integraciones',{headers:{Cookie:cookieHeader},redirect:'manual'});
assert.equal(integrations.status,200,'Administrator must be able to open Email and Security settings');
const integrationsHtml=await integrations.text();
assert.match(integrationsHtml,/Correo y seguridad/);
assert.match(integrationsHtml,/Servidor SMTP/);
assert.match(integrationsHtml,/Clave secreta/);
assert.ok(!integrationsHtml.includes('test-private-secret'),'Sensitive tokens must never appear in SSR markup');
const anonymousSettings=await fetch(origin+'/admin/integraciones',{redirect:'manual'});
assert.equal(anonymousSettings.status,307,'Integrations must require admin session');
const forgedLogout=await fetch(origin+'/api/admin/logout',{method:'POST',
 headers:{Origin:'https://attacker.invalid',Cookie:cookieHeader},redirect:'manual'});
assert.equal(forgedLogout.status,403,'Cross-origin logout must fail');
const logout=await fetch(origin+'/api/admin/logout',{method:'POST',
 headers:{Origin:origin,Cookie:cookieHeader},redirect:'manual'});
assert.equal(logout.status,303,'Logout should work as stable POST');
assert.equal(new URL(logout.headers.get('location'),origin).pathname,'/admin/acceso');
const cleared=logout.headers.getSetCookie().find(c=>c.startsWith('webappecloud_session='));
assert.ok(cleared&&/max-age=0/i.test(cleared),'Logout must expire the session cookie');
const afterLogout=await fetch(origin+'/admin',{headers:{Cookie:cookieHeader},redirect:'manual'});
assert.equal(afterLogout.status,307,'Logout must revoke the server-side session token');
assert.equal(new URL(afterLogout.headers.get('location'),origin).pathname,'/admin/acceso');
// Reproduce Enhance's HTTPS proxy behavior against a disposable CI tenant
// domain, not a customer database. Never create proxy aliases outside GitHub CI.
if(process.env.CI==="true"&&process.env.GITHUB_ACTIONS==="true"){
 const {PrismaClient}=await import("@prisma/client");
 const prisma=new PrismaClient();
 try{
  const linked=await prisma.domain.findUnique({where:{hostname:"localhost"},select:{tenantId:true}});
  assert.ok(linked,"Disposable CI domain not found");
  await prisma.domain.upsert({
   where:{hostname:"proxy.nexus.test"},
   create:{hostname:"proxy.nexus.test",tenantId:linked.tenantId},
   update:{tenantId:linked.tenantId}
  });
 }finally{await prisma.$disconnect();}
 const proxyHeaders={
  Host:"127.0.0.1:3000",
  "X-Forwarded-Host":"proxy.nexus.test",
  "X-Forwarded-Proto":"https"
 };
 const proxyCsrf=await csrfFor(proxyHeaders);
 const proxyForm=new FormData();
 proxyForm.set("csrf_token",proxyCsrf.token);
 proxyForm.set("email",process.env.ADMIN_EMAIL);
 proxyForm.set("password",process.env.ADMIN_PASSWORD);
 const forged=await fetch(origin+"/api/admin/session",{
  method:"POST",
  headers:{...proxyHeaders,Origin:"https://attacker.invalid"},
  body:proxyForm,redirect:"manual"
 });
 assert.equal(forged.status,303);
 assert.equal(new URL(forged.headers.get("location"),origin).searchParams.get("error"),"origen",
  "Missing CSRF cookie must deny proxy login");
 const proxied=await fetch(origin+"/api/admin/session",{
  method:"POST",
  headers:{...proxyHeaders,Origin:"https://proxy.nexus.test",Cookie:proxyCsrf.cookie},
  body:proxyForm,redirect:"manual"
 });
 assert.equal(proxied.status,303);
 assert.equal(new URL(proxied.headers.get("location"),origin).pathname,"/api/admin/session",
  "Trusted HTTPS proxy login should be accepted");
 const proxiedCookie=proxied.headers.getSetCookie().find(c=>c.startsWith("webappecloud_session="));
 assert.ok(proxiedCookie,"Secure proxy login cookie missing");
 const proxiedCheck=await fetch(origin+"/api/admin/session",{
  headers:{...proxyHeaders,Cookie:proxiedCookie.split(";")[0]},redirect:"manual"
 });
 assert.equal(proxiedCheck.status,303);
 assert.equal(new URL(proxiedCheck.headers.get("location"),origin).pathname,"/admin",
  "Session must remain associated with public tenant host");
 const proxiedLogout=await fetch(origin+"/api/admin/logout",{
  method:"POST",headers:{...proxyHeaders,Origin:"https://proxy.nexus.test",Cookie:proxiedCookie.split(";")[0]},
  redirect:"manual"
 });
 assert.equal(proxiedLogout.status,303,"Proxy logout must preserve CSRF validation");
 console.log("Trusted Enhance HTTPS proxy login, tenant resolution, CSRF cookie and logout passed; missing CSRF cookie rejected.");
}
console.log('Stable login and logout, cookie revocation, CSRF defense and protected integrations passed.');
