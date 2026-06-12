"use client";

import { useEffect, useMemo, useState } from "react";
import { applyLiveMinuteTick } from "@/lib/football-api/championat/ticking-live-status";
import type { ChampionatLiveStatus } from "@/lib/football-api/championat/match-live-status";

/** Плавное «дотикивание» минуты на бейдже между синками Championat. */
export function useTickingLiveStatus(
  liveStatus: ChampionatLiveStatus,
  syncedAt: string | null,
): ChampionatLiveStatus {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const anchorMs = syncedAt ? new Date(syncedAt).getTime() : null;

  return useMemo(
    () => applyLiveMinuteTick(liveStatus, anchorMs, now),
    [liveStatus, anchorMs, now],
  );
}
