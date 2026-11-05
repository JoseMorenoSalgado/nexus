import {randomBytes,timingSafeEqual} from "node:crypto";
export const csrfCookieName="nexus_admin_login_csrf";
export function newCsrfToken(){return randomBytes(32).toString("hex");}
export function validCsrfToken(submitted:string,cookie:string|undefined){
 if(!/^[a-f0-9]{64}$/.test(submitted)||!cookie||!/^[a-f0-9]{64}$/.test(cookie))return false;
 return timingSafeEqual(Buffer.from(submitted,"hex"),Buffer.from(cookie,"hex"));
}
