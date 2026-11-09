import {NextResponse} from "next/server";
import {hasDatabaseConfig} from "@/lib/server-config";
import {prisma} from "@/lib/prisma";
import {getStandalonePrisma} from "@/lib/prisma-standalone";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
const headers = {"Cache-Control": "no-store"};

function schemaError(error: unknown): boolean {
  if (!error || typeof error !== "object" || !("code" in error)) return false;
  return error.code === "P2021" || error.code === "P2022";
}

/** Read-only readiness check for the active database architecture. */
export async function GET() {
  try {
    if (!hasDatabaseConfig()) {
      return NextResponse.json({status: "unavailable", reason: "not_configured"}, {status: 503, headers});
    }
    if (process.env.NEXUS_STANDALONE === "true") {
      const db = getStandalonePrisma();
      await db.$queryRaw`SELECT 1`;
      const [config] = await Promise.all([
        db.siteConfig.findUnique({where: {id: "main"}, select: {id: true}}),
        db.sitePage.findFirst({select: {id: true, published: true}}),
        db.property.findFirst({select: {id: true, published: true}}),
        db.adminUser.findFirst({select: {id: true, active: true}})
      ]);
      if (!config) {
        return NextResponse.json({status: "unavailable", reason: "installation_incomplete"}, {status: 503, headers});
      }
      return NextResponse.json({status: "ok", mode: "standalone"}, {headers});
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
    console.error("[health] readiness failed:", reason, error instanceof Error ? error.name : "unknown");
    return NextResponse.json({status: "unavailable", reason}, {status: 503, headers});
  }
}
