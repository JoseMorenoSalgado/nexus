import {NextRequest, NextResponse} from "next/server";
import {installerAvailable} from "@/lib/server-config";
import {automaticInstallerEnabled, issueInstallerSession, validInstallerSession, validSetupToken, INSTALLER_SESSION_COOKIE, INSTALLER_SESSION_SECONDS} from "@/lib/installer-session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Relative redirects are required behind Dokploy/Traefik. Constructing a URL
 * from req.url can expose an internal bind address (0.0.0.0:3000) to visitors.
 */
function redirectLocal(path: string) {
  return new NextResponse(null, {
    status: 307,
    headers: {Location: path, "Cache-Control": "no-store"}
  });
}

function shouldUseSecureCookie(req: NextRequest) {
  const forwardedProto = (req.headers.get("x-forwarded-proto") || "").split(",")[0].trim().toLowerCase();
  const publicHost = (req.headers.get("host") || "").split(":")[0].toLowerCase();
  const isLocal = ["localhost", "127.0.0.1", "0.0.0.0"].includes(publicHost);
  return forwardedProto === "https" || req.nextUrl.protocol === "https:"
    || (process.env.NODE_ENV === "production" && !isLocal);
}

export async function POST(req: NextRequest) {
  if (!installerAvailable()) return redirectLocal("/admin/acceso");
  const origin=req.headers.get("origin");
  const host=req.headers.get("host");
  if (!origin || !host) return redirectLocal("/instalar?estado=invalido");
  try { if (new URL(origin).host.toLowerCase() !== host.toLowerCase()) return redirectLocal("/instalar?estado=invalido"); }
  catch { return redirectLocal("/instalar?estado=invalido"); }
  if (Number(req.headers.get("content-length") || "0") > 4096) return redirectLocal("/instalar?estado=invalido");
  let token="";
  try { token=String((await req.formData()).get("token") || ""); }
  catch { return redirectLocal("/instalar?estado=invalido"); }
  try { if (!validSetupToken(token)) return redirectLocal("/instalar?estado=invalido"); }
  catch { return redirectLocal("/instalar?estado=almacenamiento"); }
  let session: string | null;
  try { session=issueInstallerSession(); }
  catch { return redirectLocal("/instalar?estado=almacenamiento"); }
  if (!session) return redirectLocal("/instalar?estado=ocupado");
  const res=new NextResponse(null,{status:303,headers:{Location:"/instalar","Cache-Control":"no-store"}});
  res.cookies.set(INSTALLER_SESSION_COOKIE,session,{httpOnly:true,secure:shouldUseSecureCookie(req),sameSite:"strict",path:"/",maxAge:INSTALLER_SESSION_SECONDS});
  return res;
}

export function GET(){return redirectLocal("/instalar");}
