/**
 * Test a first-run installer session with Safari/WebKit in isolated CI.
 * Reuse the session cookie obtained by the existing CI curl request.
 * This script DOES NOT send POST /api/install or modify the SQL database.
 */
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {webkit} from "playwright";

const origin = process.env.TEST_ORIGIN || "http://localhost:3002";
assert.ok(["localhost","127.0.0.1"].includes(new URL(origin).hostname), "No production installer testing.");
const cookieFile = process.env.PLAYWRIGHT_COOKIE_FILE;
assert.ok(cookieFile,"CI must supply its private installer cookie file");
const lines = readFileSync(cookieFile,"utf8").split(/\r?\n/);
let token;
for (let line of lines) {
  if(line.startsWith("#HttpOnly_")) line=line.slice("#HttpOnly_".length);
  else if(line.startsWith("#")) continue;
  const parts=line.trim().split("\t");
  if(parts.length>=7&&parts.at(-2)==="wec_setup_session") token=parts.at(-1);
}
assert.match(token||"",/^[a-f0-9]{64}$/,"Installer cookie missing in isolated CI");
const browser=await webkit.launch({headless:true});
try {
 const context=await browser.newContext({
  viewport:{width:375,height:812},
  isMobile:true,hasTouch:true,
  reducedMotion:"no-preference"
 });
 await context.addCookies([{name:"wec_setup_session",value:token,url:origin,httpOnly:true,sameSite:"Strict",secure:false}]);
 const page=await context.newPage();
 const errors=[];
 page.on("pageerror",e=>errors.push(String(e.message).slice(0,260)));
 page.on("response",r=>{
  if(/\/_next\/static\/.+\.js(?:\?|$)/.test(r.url())&&r.status()>=400)
   errors.push("JS chunk HTTP "+r.status());
 });
 const res=await page.goto(origin+"/instalar",{waitUntil:"domcontentloaded",timeout:30000});
 assert.equal(res?.status(),200);
 await page.getByRole("heading",{name:"Conexión a la base de datos"}).waitFor();
 await page.waitForTimeout(1000);
 assert.equal(await page.locator(".wizard-error").count(),0,"Installer session was rejected");
 assert.equal(await page.locator('input[type="password"]').count(),1,"Expected SQL password input");
 await page.locator('input[type="password"]').fill("ci-only-not-a-production-secret");
 await page.getByRole("button",{name:/Continuar/}).click();
 await page.getByRole("heading",{name:"Configura tu espacio de trabajo"}).waitFor();
 assert.match(await page.locator(".wizard-domain").innerText(),/localhost/);
 assert.ok(!(await page.locator("body").innerText()).includes("Application error: a client-side exception"));
 assert.deepEqual(errors,[],"Safari installer JavaScript crashed");
 console.log("NEXUS installer WebKit: mobile hydration and initial wizard navigation passed; SQL installation was not submitted.");
 await context.close();
} finally {
 await browser.close();
}
