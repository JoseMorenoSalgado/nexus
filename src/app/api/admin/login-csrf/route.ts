import {NextResponse} from "next/server";
import {csrfCookieName,newCsrfToken} from "@/lib/admin-login-csrf";
export const runtime="nodejs";
export const dynamic="force-dynamic";
export async function GET(){
 const token=newCsrfToken();
 const response=NextResponse.json({token},{headers:{"Cache-Control":"no-store, private","Pragma":"no-cache"}});
 response.cookies.set(csrfCookieName,token,{httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"strict",path:"/api/admin",maxAge:600});
 return response;
}
