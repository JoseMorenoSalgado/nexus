import {NextRequest, NextResponse} from "next/server";
import {installerAvailable} from "@/lib/server-config";
import {automaticInstallerEnabled, issueInstallerSession, validInstallerSession, INSTALLER_SESSION_COOKIE, INSTALLER_SESSION_SECONDS} from "@/lib/installer-session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Keep public origin when Docker reports internal URL 0.0.0.0:3000.
 * Relative Location headers also avoid trusting client-controlled Host headers.
 */
function redirectTo(path:string){
 return new NextResponse(null,{status:303,headers:{
  "Location":path,
  "Cache-Control":"private, no-store, max-age=0"
 }});
}
export function GET(req: NextRequest){
 if (!installerAvailable()) return redirectTo("/admin/acceso");
 if (!automaticInstallerEnabled()) return redirectTo("/instalar");
 const existing = req.cookies.get(INSTALLER_SESSION_COOKIE)?.value;
 if (validInstallerSession(existing)) return redirectTo("/instalar");
 let token: string | null;
 try {token = issueInstallerSession();}
 catch {return redirectTo("/instalar?estado=almacenamiento");}
 if (!token) return redirectTo("/instalar?estado=ocupado");
 const res = redirectTo("/instalar");
 res.headers.set("Cache-Control", "no-store");
 res.cookies.set(INSTALLER_SESSION_COOKIE, token, {
  httpOnly:true,
  secure:req.nextUrl.protocol === "https:" || (process.env.NODE_ENV === "production" && !["localhost","127.0.0.1"].includes(req.nextUrl.hostname)),
  sameSite:"strict", path:"/", maxAge:INSTALLER_SESSION_SECONDS
 });
 return res;
}
