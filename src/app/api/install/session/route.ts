import {NextRequest, NextResponse} from "next/server";
import {installerAvailable,manualInstallerEnabled} from "@/lib/server-config";
import {STEP_COOKIE,validStepProof} from "@/lib/installer-step";
import {consumeWhmcsActivation,whmcsActivationEnabled} from "@/lib/whmcs-activation";
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
  if (!validStepProof(req.cookies.get(STEP_COOKIE)?.value)) return redirectLocal("/instalar?estado=calculo");
  const origin=req.headers.get("origin");
  const host=req.headers.get("host");
  if (!origin || !host) return redirectLocal("/instalar?paso=activar&estado=origen");
  // Only accept a forwarded public host if the direct Host is an internal proxy
  // address. A client-supplied X-Forwarded-Host must not override a public Host.
  const directHost=host.trim().toLowerCase();
  const hostname=directHost.startsWith("[") ? directHost.slice(1).split("]")[0] : directHost.split(":")[0];
  const internalHost=hostname==="localhost" || hostname==="0.0.0.0" ||
    hostname==="127.0.0.1" || hostname.startsWith("10.") ||
    hostname.startsWith("192.168.") || /^172\.(1[6-9]|2[0-9]|3[01])\./.test(hostname);
  const forwardedHost=req.headers.get("x-forwarded-host")?.split(",")[0]?.trim().toLowerCase();
  try {
    const parsed=new URL(origin);
    const validOrigin=parsed.protocol==="https:" || parsed.protocol==="http:";
    const sameHost=parsed.host.toLowerCase()===directHost ||
      (internalHost && Boolean(forwardedHost) && parsed.host.toLowerCase()===forwardedHost);
    const browserSameOrigin=req.headers.get("sec-fetch-site")==="same-origin" && parsed.protocol==="https:" && process.env.NODE_ENV==="production";
    if (!validOrigin || (!sameHost && !browserSameOrigin)) return redirectLocal("/instalar?paso=activar&estado=origen");
  } catch { return redirectLocal("/instalar?estado=origen"); }
  if (Number(req.headers.get("content-length") || "0") > 4096) return redirectLocal("/instalar?paso=activar&estado=invalido");
  let token="";
  try { const form=await req.formData(); token=String(form.get("token") || ""); }
  catch { return redirectLocal("/instalar?estado=invalido"); }
  try {
    const domain=new URL(origin).hostname.toLowerCase();
    const allowed=manualInstallerEnabled()
      ? true
      : whmcsActivationEnabled()
        ? await consumeWhmcsActivation(token,domain)
        : validSetupToken(token);
    if(!allowed)return redirectLocal("/instalar?paso=activar&estado=invalido");
  } catch { return redirectLocal("/instalar?paso=activar&estado=almacenamiento"); }
  let session: string | null;
  try { session=issueInstallerSession(); }
  catch { return redirectLocal("/instalar?estado=almacenamiento"); }
  if (!session) return redirectLocal("/instalar?paso=activar&estado=ocupado");
  const res=new NextResponse(null,{status:303,headers:{Location:"/instalar","Cache-Control":"no-store"}});
  res.cookies.set(INSTALLER_SESSION_COOKIE,session,{httpOnly:true,secure:shouldUseSecureCookie(req),sameSite:"strict",path:"/",maxAge:INSTALLER_SESSION_SECONDS});
  res.cookies.set(STEP_COOKIE,"",{path:"/",maxAge:0});
  return res;
}

export function GET(){return redirectLocal("/instalar");}
