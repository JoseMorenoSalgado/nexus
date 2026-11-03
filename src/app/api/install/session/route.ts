import {NextRequest, NextResponse} from "next/server";
import {installerAvailable} from "@/lib/server-config";
import {STEP_COOKIE,validStepProof} from "@/lib/installer-step";
import {installerOriginAllowed} from "@/lib/installer-origin";
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
  if (!installerOriginAllowed(req)) return redirectLocal("/instalar?paso=activar&estado=origen");
  const origin=req.headers.get("origin")!;
  if (Number(req.headers.get("content-length") || "0") > 4096) return redirectLocal("/instalar?paso=activar&estado=invalido");
  let token="";
  try { const form=await req.formData(); token=String(form.get("token") || ""); }
  catch { return redirectLocal("/instalar?estado=invalido"); }
  try {
    const domain=new URL(origin).hostname.toLowerCase();
    const allowed=whmcsActivationEnabled()
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
