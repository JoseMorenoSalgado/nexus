import {NextResponse} from "next/server";
import {installerAvailable} from "@/lib/server-config";
import {issueInstallerSession, INSTALLER_SESSION_COOKIE, INSTALLER_SESSION_SECONDS} from "@/lib/installer-session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Only expose this endpoint while the site is restricted at the hosting layer. */
function redirectLocal(path:string){return new NextResponse(null,{status:303,headers:{Location:path,"Cache-Control":"no-store"}});}
export async function GET() {
 if (!installerAvailable()) return redirectLocal("/admin/acceso");
 let session: string | null;
 try {session=issueInstallerSession();}
 catch {return redirectLocal("/instalar?estado=almacenamiento");}
 if (!session) return redirectLocal("/instalar?estado=ocupado");
 const response=redirectLocal("/instalar");
 response.headers.set("Cache-Control","no-store");
 response.cookies.set(INSTALLER_SESSION_COOKIE,session,{httpOnly:true,secure:true,sameSite:"strict",path:"/",maxAge:INSTALLER_SESSION_SECONDS});
 return response;
}
