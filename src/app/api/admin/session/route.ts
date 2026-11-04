
import { randomBytes, createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { currentAdmin, verifyPassword } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasDatabaseConfig } from "@/lib/server-config";
import { normalizeSiteHost } from "@/lib/preview";
import { verifyLoginCaptcha } from "@/lib/recaptcha";
import {
  validPublicMutationOrigin,
  publicRequestHostname,
} from "@/lib/public-request-origin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const cookieName = "webappecloud_session";
const sessionSeconds = 24 * 60 * 60;

// Redirecciones relativas para conservar el dominio
// público y HTTPS detrás del proxy de Enhance.
function go(_req: NextRequest, path: string) {
  return new NextResponse(null, {
    status: 303,
    headers: {
      Location: path,
      "Cache-Control": "no-store",
    },
  });
}

function fail(req: NextRequest, code: string) {
  return go(
    req,
    "/admin/acceso?error=" + encodeURIComponent(code)
  );
}

// Validación CSRF con diagnóstico para Enhance.
// No se desactiva ninguna comprobación de seguridad.
function sameOrigin(req: NextRequest): boolean {
  const valid = validPublicMutationOrigin(req.headers);

  if (!valid) {
    console.error("[admin-login] CSRF origin rejected", {
      origin: req.headers.get("origin"),
      host: req.headers.get("host"),
      forwardedHost: req.headers.get("x-forwarded-host"),
      forwardedProto: req.headers.get("x-forwarded-proto"),
      siteUrlConfigured: Boolean(process.env.SITE_URL),
    });
  }

  return valid;
}

function logIssue(stage: string, error: unknown) {
  console.error(
    "[admin-login]",
    stage,
    error instanceof Error ? error.name : "unknown"
  );
}

// POST: Inicio de sesión del administrador.
export async function POST(req: NextRequest) {
  if (!hasDatabaseConfig()) {
    return go(req, "/instalar");
  }

  // Protección contra solicitudes de otros orígenes.
  if (!sameOrigin(req)) {
    return fail(req, "origen");
  }

  if (Number(req.headers.get("content-length") || 0) > 8000) {
    return fail(req, "solicitud");
  }

  let email: string;
  let password: string;
  let captchaToken: string;

  try {
    const form = await req.formData();

    email = String(form.get("email") || "")
      .trim()
      .toLowerCase();

    password = String(form.get("password") || "");

    captchaToken = String(
      form.get("g-recaptcha-response") || ""
    );
  } catch {
    return fail(req, "solicitud");
  }

  if (
    email.length < 3 ||
    email.length > 180 ||
    password.length < 8 ||
    password.length > 256
  ) {
    return fail(req, "credenciales");
  }

  try {
    const hostname = normalizeSiteHost(
      publicRequestHostname(req.headers) || ""
    );

    const domain = await prisma.domain.findUnique({
      where: { hostname },
      select: { tenantId: true },
    });

    if (!domain) {
      return fail(req, "dominio");
    }

    const key = createHash("sha256")
      .update(domain.tenantId + ":" + email)
      .digest("hex");

    const now = new Date();

    const previous =
      await prisma.adminLoginThrottle.findUnique({
        where: { key },
      });

    if (
      previous &&
      previous.expiresAt > now &&
      previous.attempts >= 5
    ) {
      return fail(req, "bloqueado");
    }

    if (!await verifyLoginCaptcha(captchaToken, hostname)) {
      return fail(req, "captcha");
    }

    const user = await prisma.adminUser.findUnique({
      where: {
        tenantId_email: {
          tenantId: domain.tenantId,
          email,
        },
      },
      select: {
        id: true,
        active: true,
        passwordHash: true,
        tenant: {
          select: {
            active: true,
          },
        },
      },
    });

    if (
      !user ||
      !user.active ||
      !user.tenant.active ||
      !verifyPassword(password, user.passwordHash)
    ) {
      const expiresAt = new Date(
        Date.now() + 15 * 60 * 1000
      );

      if (previous && previous.expiresAt > now) {
        await prisma.adminLoginThrottle.update({
          where: { key },
          data: {
            attempts: {
              increment: 1,
            },
          },
        });
      } else {
        await prisma.adminLoginThrottle.upsert({
          where: { key },
          create: {
            key,
            attempts: 1,
            expiresAt,
          },
          update: {
            attempts: 1,
            expiresAt,
          },
        });
      }

      return fail(req, "credenciales");
    }

    await prisma.adminLoginThrottle.deleteMany({
      where: { key },
    });

    const raw = randomBytes(32).toString("hex");

    const tokenHash = createHash("sha256")
      .update(raw)
      .digest("hex");

    await prisma.adminSession.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt: new Date(
          Date.now() + sessionSeconds * 1000
        ),
      },
    });

    // Verificar la cookie mediante un GET independiente
    // antes de permitir el acceso al panel.
    const response = go(req, "/api/admin/session");

    response.cookies.set(cookieName, raw, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: sessionSeconds,
    });

    return response;
  } catch (error) {
    logIssue("unexpected-failure", error);
    return fail(req, "servidor");
  }
}

// GET: Comprobar sesión del administrador.
export async function GET(req: NextRequest) {
  if (!hasDatabaseConfig()) {
    return go(req, "/instalar");
  }

  try {
    return (await currentAdmin())
      ? go(req, "/admin")
      : fail(req, "sesion");
  } catch (error) {
    logIssue("session-validation", error);
    return fail(req, "servidor");
  }
}
