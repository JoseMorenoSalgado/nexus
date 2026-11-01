import {NextRequest, NextResponse} from "next/server";
import {installerAvailable} from "@/lib/server-config";
import {issueInstallerSession, INSTALLER_SESSION_COOKIE, INSTALLER_SESSION_SECONDS} from "@/lib/installer-session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Only expose this endpoint while the site is restricted at the hosting layer. */
export async function GET(req: NextRequest) {
 if (!installerAvailable()) return NextResponse.redirect(new URL("/admin/acceso", req.url));
 let session: string | null;
 try {session=issueInstallerSession();}
 catch {return NextResponse.redirect(new URL("/instalar?estado=almacenamiento", req.url));}
 if (!session) return NextResponse.redirect(new URL("/instalar?estado=ocupado", req.url));
 const response=NextResponse.redirect(new URL("/instalar", req.url));
 response.headers.set("Cache-Control","no-store");
 response.cookies.set(INSTALLER_SESSION_COOKIE,session,{httpOnly:true,secure:true,sameSite:"strict",path:"/",maxAge:INSTALLER_SESSION_SECONDS});
 return response;
}
