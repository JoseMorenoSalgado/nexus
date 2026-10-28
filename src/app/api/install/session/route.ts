import {NextRequest, NextResponse} from "next/server";
import {installerAvailable} from "@/lib/server-config";
import {automaticInstallerEnabled, issueInstallerSession, validInstallerSession, INSTALLER_SESSION_COOKIE, INSTALLER_SESSION_SECONDS} from "@/lib/installer-session";

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

export function GET(req: NextRequest) {
  if (!installerAvailable()) return redirectLocal("/admin/acceso");
  if (!automaticInstallerEnabled()) return redirectLocal("/instalar");
  const existing = req.cookies.get(INSTALLER_SESSION_COOKIE)?.value;
  if (validInstallerSession(existing)) return redirectLocal("/instalar");

  let token: string | null;
  try { token = issueInstallerSession(); }
  catch { return redirectLocal("/instalar?estado=almacenamiento"); }
  if (!token) return redirectLocal("/instalar?estado=ocupado");

  const res = redirectLocal("/instalar");
  res.cookies.set(INSTALLER_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: shouldUseSecureCookie(req),
    sameSite: "strict",
    path: "/",
    maxAge: INSTALLER_SESSION_SECONDS
  });
  return res;
}
