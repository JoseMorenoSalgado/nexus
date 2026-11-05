import {test} from "node:test";
import {strict as assert} from "node:assert";
import {newCsrfToken,validCsrfToken} from "../src/lib/admin-login-csrf";
test("CSRF token must match unpredictable HttpOnly cookie",()=>{
 const token=newCsrfToken();
 assert.equal(token.length,64);
 assert.equal(validCsrfToken(token,token),true);
 assert.equal(validCsrfToken(token,newCsrfToken()),false);
 assert.equal(validCsrfToken("",token),false);
 assert.equal(validCsrfToken(token,undefined),false);
 assert.equal(validCsrfToken("z".repeat(64),token),false);
});
