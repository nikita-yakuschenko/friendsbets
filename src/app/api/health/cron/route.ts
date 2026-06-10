import { NextResponse } from "next/server";
import { CRON_JOB_IDS, getLastCronRuns } from "@/lib/cron-run";

const CRON_JOBS_META = [
  {
    id: CRON_JOB_IDS.SYNC_MATCHES,
    path: "/api/cron/sync-matches",
    description: "Championat sync (mode=quick|full)",
  },
  {
    id: CRON_JOB_IDS.PREDICTION_REMINDERS,
    path: "/api/cron/prediction-reminders",
    description: "Prediction reminders (email, Telegram, in-app)",
  },
] as const;

export async function GET() {
  try {
    const lastRuns = await getLastCronRuns();
    return NextResponse.json({
      ok: true,
      persistence: true,
      jobs: CRON_JOBS_META,
      lastRuns,
    });
  } catch {
    return NextResponse.json({
      ok: false,
      persistence: false,
      jobs: CRON_JOBS_META,
      lastRuns: [],
      database: "unavailable",
    });
  }
}
