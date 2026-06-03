import { NextResponse } from "next/server";
import { CRON_JOB_IDS, recordCronRun } from "@/lib/cron-run";
import { sendDuePredictionReminders } from "@/lib/reminders/prediction-reminders";

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
  try {
    const result = await sendDuePredictionReminders();
    await recordCronRun({
      jobId: CRON_JOB_IDS.PREDICTION_REMINDERS,
      ok: true,
      startedAt,
      summary: result,
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Reminders failed";
    await recordCronRun({
      jobId: CRON_JOB_IDS.PREDICTION_REMINDERS,
      ok: false,
      startedAt,
      summary: { error: message },
    });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  return GET(request);
}
