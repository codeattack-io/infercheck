import * as Sentry from "@sentry/nextjs";
import { NextRequest, NextResponse } from "next/server";
import { PROVIDER_ADAPTERS, runSync } from "@/lib/sync/run";

/**
 * GET /api/cron/sync-models
 *
 * Called by Vercel Cron on a nightly schedule (see vercel.json).
 * Requires the CRON_SECRET environment variable — Vercel sends it as a Bearer
 * token in the Authorization header. Without CRON_SECRET every request is rejected.
 * Responds with 500 when any adapter fails, so Vercel marks the cron run as failed;
 * the errors themselves go to Sentry.
 *
 * Can also be triggered manually (e.g. for a first-time seed):
 *   curl -H "Authorization: Bearer $CRON_SECRET" https://your-domain.com/api/cron/sync-models
 *   curl -H "Authorization: Bearer $CRON_SECRET" "https://your-domain.com/api/cron/sync-models?provider=scaleway"
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const authHeader = request.headers.get("Authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    console.error("[sync-models cron] CRON_SECRET is not set — refusing to run");
    return NextResponse.json({ error: "Not configured" }, { status: 500 });
  }

  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const provider = request.nextUrl.searchParams.get("provider") ?? undefined;

  if (provider && !Object.hasOwn(PROVIDER_ADAPTERS, provider)) {
    return NextResponse.json({ error: "Unknown provider" }, { status: 400 });
  }

  try {
    const { failures } = await runSync({ targetProvider: provider });
    if (failures.length === 0) return NextResponse.json({ ok: true });

    for (const { adapter, error } of failures) {
      Sentry.captureException(error, { tags: { job: "sync-models", adapter } });
    }
    await Sentry.flush(2000);
    return NextResponse.json(
      { ok: false, error: "Sync failed for some adapters", failedAdapters: failures.map((f) => f.adapter) },
      { status: 500 }
    );
  } catch (e) {
    console.error("[sync-models cron] Fatal error:", e);
    Sentry.captureException(e, { tags: { job: "sync-models" } });
    await Sentry.flush(2000);
    return NextResponse.json({ ok: false, error: "Sync failed" }, { status: 500 });
  }
}
