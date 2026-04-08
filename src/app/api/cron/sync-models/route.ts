import { NextRequest, NextResponse } from "next/server";
import { runSync } from "@/lib/sync/run";

/**
 * GET /api/cron/sync-models
 *
 * Called by Vercel Cron on a nightly schedule (see vercel.json).
 * Protected by the CRON_SECRET environment variable — Vercel injects this
 * automatically as a Bearer token in the Authorization header.
 *
 * Can also be triggered manually (e.g. for a first-time seed):
 *   curl -H "Authorization: Bearer $CRON_SECRET" https://your-domain.com/api/cron/sync-models
 *   curl -H "Authorization: Bearer $CRON_SECRET" "https://your-domain.com/api/cron/sync-models?provider=scaleway"
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  // Verify cron secret — Vercel sets this automatically; check against env for
  // both Vercel-injected calls and manual curl invocations.
  const authHeader = request.headers.get("Authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const provider = request.nextUrl.searchParams.get("provider") ?? undefined;

  try {
    await runSync({ targetProvider: provider });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[sync-models cron] Fatal error:", e);
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
