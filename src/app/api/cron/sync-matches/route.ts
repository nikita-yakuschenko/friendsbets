import { NextResponse } from "next/server";
import { CRON_JOB_IDS, recordCronRun } from "@/lib/cron-run";
import { runScheduledChampionatMatchSyncs } from "@/lib/football-api/championat/sync-scheduled-championat-matches";
import { syncMatches } from "@/lib/football-api/sync";

function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;

  const header = request.headers.get("authorization");
  if (header === `Bearer ${secret}`) return true;

  const url = new URL(request.url);
  return url.searchParams.get("secret") === secret;
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const startedAt = new Date();
  const url = new URL(request.url);
  const mode = url.searchParams.get("mode") === "full" ? "full" : "quick";

  try {
    const scheduled = await runScheduledChampionatMatchSyncs();
    const result = await syncMatches(undefined, { mode });
    await recordCronRun({
      jobId: CRON_JOB_IDS.SYNC_MATCHES,
      ok: true,
      startedAt,
      mode,
      summary: {
        created: result.created,
        updated: result.updated,
        total: result.total,
        venuesUpdated: result.venuesUpdated,
        scheduledCandidates: scheduled.candidates,
        scheduledPolled: scheduled.polled,
        scheduledUpdated: scheduled.updated,
        scheduledErrors: scheduled.errors,
      },
    });
    return NextResponse.json({ ok: true, mode, scheduled, ...result });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Championat sync failed";
    await recordCronRun({
      jobId: CRON_JOB_IDS.SYNC_MATCHES,
      ok: false,
      startedAt,
      mode,
      summary: { error: message },
    });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  return GET(request);
}
