import {NextResponse} from "next/server";
import {hasDatabaseConfig} from "@/lib/server-config";
import {prisma} from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
const headers = {"Cache-Control": "no-store"};

function schemaError(error: unknown): boolean {
  if (!error || typeof error !== "object" || !("code" in error)) return false;
  return error.code === "P2021" || error.code === "P2022";
}

/**
 * Read-only readiness check. SELECT 1 alone is not enough: a freshly-created
 * SQL database can accept connections while Domain (required by every public
 * page) and the other CMS tables are absent.
 *
 * Do not attempt migrations, seed data or change installation state here.
 */
export async function GET() {
  try {
    if (!hasDatabaseConfig()) {
      return NextResponse.json({status: "unavailable", reason: "not_configured"}, {status: 503, headers});
    }
    await prisma.$queryRaw`SELECT 1`;
    await Promise.all([
      prisma.domain.findFirst({select: {id: true, tenantId: true}}),
      prisma.tenant.findFirst({select: {id: true, active: true}}),
      prisma.sitePage.findFirst({select: {id: true, tenantId: true, published: true}}),
      prisma.property.findFirst({select: {id: true, published: true}}),
      prisma.adminUser.findFirst({select: {id: true, active: true}})
    ]);
    return NextResponse.json({status: "ok"}, {headers});
  } catch (error) {
    const reason = schemaError(error) ? "schema_incomplete" : "database_unavailable";
    // Log only the error class and generic readiness reason, never SQL URLs.
    console.error("[health] readiness failed:", reason, error instanceof Error ? error.name : "unknown");
    return NextResponse.json({status: "unavailable", reason}, {status: 503, headers});
  }
}
