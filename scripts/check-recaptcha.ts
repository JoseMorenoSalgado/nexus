import assert from "node:assert/strict";
import {recaptchaRequired,recaptchaSiteKey,verifyLoginCaptcha} from "../src/lib/recaptcha";

async function main(){
 const old={
  required:process.env.RECAPTCHA_REQUIRED,
  site:process.env.RECAPTCHA_SITE_KEY,
  secret:process.env.RECAPTCHA_SECRET_KEY
 };
 const realFetch=globalThis.fetch;
 try{
  process.env.RECAPTCHA_REQUIRED="false";
  assert.equal(recaptchaRequired(),false);
  assert.equal(await verifyLoginCaptcha("","localhost"),true,"Default rollout must not lock out existing users.");
  process.env.RECAPTCHA_REQUIRED="true";
  delete process.env.RECAPTCHA_SITE_KEY;
  delete process.env.RECAPTCHA_SECRET_KEY;
  assert.equal(recaptchaSiteKey(),"");
  assert.equal(await verifyLoginCaptcha("token","localhost"),false,"Misconfigured CAPTCHA must fail closed.");
  process.env.RECAPTCHA_SITE_KEY="test-site-key";
  process.env.RECAPTCHA_SECRET_KEY="test-private-secret";
  assert.equal(await verifyLoginCaptcha("","localhost"),false);
  globalThis.fetch=(async(_url:RequestInfo|URL,opts?:RequestInit)=>{
   assert.equal(opts?.method,"POST");
   assert.ok(String(opts?.body).includes("secret=test-private-secret"));
   return new Response(JSON.stringify({success:true,hostname:"localhost"}),{status:200});
  }) as typeof fetch;
  assert.equal(await verifyLoginCaptcha("mock-token","localhost"),true);
  assert.equal(await verifyLoginCaptcha("mock-token","other.example"),false,"A token for another host must fail.");
  globalThis.fetch=(async()=>new Response(JSON.stringify({success:true,hostname:"localhost","error-codes":["Over free quota."]}),{status:200})) as typeof fetch;
  assert.equal(await verifyLoginCaptcha("mock-token","localhost"),false,"Quota errors must not be treated as success.");
  globalThis.fetch=(async()=>{throw Error("network");}) as typeof fetch;
  assert.equal(await verifyLoginCaptcha("mock-token","localhost"),false,"Verification failure must fail closed.");
  console.log("reCAPTCHA: optional rollout, missing keys, hostname binding and fail-closed verification tested.");
 }finally{
  globalThis.fetch=realFetch;
  for(const [envKey,value] of [["RECAPTCHA_REQUIRED",old.required],["RECAPTCHA_SITE_KEY",old.site],["RECAPTCHA_SECRET_KEY",old.secret]] as const){
   if(value===undefined)delete process.env[envKey];else process.env[envKey]=value;
  }
 }
}
void main().catch(error=>{console.error(error);process.exitCode=1;});
