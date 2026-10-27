import {NextRequest, NextResponse} from "next/server";
import {installerAvailable} from "@/lib/server-config";
import {automaticInstallerEnabled, issueInstallerSession, validInstallerSession, INSTALLER_SESSION_COOKIE, INSTALLER_SESSION_SECONDS} from "@/lib/installer-session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export function GET(req: NextRequest){
 if (!installerAvailable()) return NextResponse.redirect(new URL("/admin/acceso", req.url));
 if (!automaticInstallerEnabled()) return NextResponse.redirect(new URL("/instalar", req.url));
 const existing = req.cookies.get(INSTALLER_SESSION_COOKIE)?.value;
 if (validInstallerSession(existing)) return NextResponse.redirect(new URL("/instalar", req.url));
 let token: string | null;
 try {token = issueInstallerSession();}
 catch {return NextResponse.redirect(new URL("/instalar?estado=almacenamiento", req.url));}
 if (!token) return NextResponse.redirect(new URL("/instalar?estado=ocupado", req.url));
 const res = NextResponse.redirect(new URL("/instalar", req.url));
 res.headers.set("Cache-Control", "no-store");
 res.cookies.set(INSTALLER_SESSION_COOKIE, token, {
  httpOnly:true,
  secure:req.nextUrl.protocol === "https:" || (process.env.NODE_ENV === "production" && !["localhost","127.0.0.1"].includes(req.nextUrl.hostname)),
  sameSite:"strict", path:"/", maxAge:INSTALLER_SESSION_SECONDS
 });
 return res;
}
