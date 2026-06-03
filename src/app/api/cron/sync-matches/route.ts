import { NextResponse } from "next/server";
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

  try {
    const scheduled = await runScheduledChampionatMatchSyncs();
    const result = await syncMatches();
    return NextResponse.json({ ok: true, scheduled, ...result });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Championat sync failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  return GET(request);
}
