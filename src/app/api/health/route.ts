import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { supabase } from "@/lib/db-client";
import { healthResponseSchema, type HealthResponse } from "@/lib/schemas";

export const dynamic = "force-dynamic";

export async function GET() {
  const startTime = Date.now();

  try {
    // Consulta pública anônima para checar conectividade com o banco e última sincronização
    const { data: latestSyncData, error: dbError } = await supabase
      .from("processos_emendas")
      .select("ultima_sincronizacao")
      .order("ultima_sincronizacao", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (dbError) {
      Sentry.captureException(dbError);
      const latencyMs = Date.now() - startTime;
      const errorPayload: HealthResponse = {
        status: "error",
        timestamp: new Date().toISOString(),
        latencyMs,
        sync: {
          lastSyncAt: null,
          status: "unknown",
        },
      };
      return NextResponse.json(healthResponseSchema.parse(errorPayload), { status: 503 });
    }

    const latencyMs = Date.now() - startTime;

    if (!latestSyncData?.ultima_sincronizacao) {
      const degradedPayload: HealthResponse = {
        status: "degraded",
        timestamp: new Date().toISOString(),
        latencyMs,
        sync: {
          lastSyncAt: null,
          status: "unknown",
        },
      };
      return NextResponse.json(healthResponseSchema.parse(degradedPayload), { status: 200 });
    }

    const lastSyncDate = new Date(latestSyncData.ultima_sincronizacao);
    const hoursSinceLastSync = (Date.now() - lastSyncDate.getTime()) / (1000 * 60 * 60);
    const isSynced = !isNaN(hoursSinceLastSync) && hoursSinceLastSync >= 0 && hoursSinceLastSync <= 24;

    const responsePayload: HealthResponse = {
      status: isSynced ? "ok" : "degraded",
      timestamp: new Date().toISOString(),
      latencyMs,
      sync: {
        lastSyncAt: lastSyncDate.toISOString(),
        status: isSynced ? "synced" : "stale",
      },
    };

    return NextResponse.json(healthResponseSchema.parse(responsePayload), { status: 200 });
  } catch (error: unknown) {
    Sentry.captureException(error);
    const latencyMs = Date.now() - startTime;
    const fallbackPayload: HealthResponse = {
      status: "error",
      timestamp: new Date().toISOString(),
      latencyMs,
      sync: {
        lastSyncAt: null,
        status: "unknown",
      },
    };
    return NextResponse.json(healthResponseSchema.parse(fallbackPayload), { status: 503 });
  }
}
