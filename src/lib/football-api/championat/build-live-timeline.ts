import type { ChampionatLivePhase } from "@/lib/football-api/championat/match-live-phase";
import type { ChampionatMatchEvent } from "@/lib/football-api/championat/match-protocol-types";

export type TimelineMarkerKind = "start" | "halftime" | "end";

export type LiveTimelineRow =
  | { kind: "marker"; id: string; marker: TimelineMarkerKind; label: string }
  | { kind: "event"; id: string; event: ChampionatMatchEvent };

const MARKER_LABELS: Record<TimelineMarkerKind, string> = {
  start: "Матч начался",
  halftime: "Перерыв",
  end: "Матч окончен",
};

export function buildLiveTimelineRows(
  events: ChampionatMatchEvent[],
  livePhase: ChampionatLivePhase,
  matchStatus?: string,
): LiveTimelineRow[] {
  const isActivePhase =
    livePhase === "live" ||
    livePhase === "halftime" ||
    livePhase === "extra_time" ||
    livePhase === "penalties";
  const started =
    isActivePhase ||
    matchStatus === "LIVE" ||
    matchStatus === "FINISHED" ||
    events.length > 0;
  const finished = livePhase === "finished" || matchStatus === "FINISHED";

  if (!started) return [];

  const rows: LiveTimelineRow[] = [
    { kind: "marker", id: "marker-start", marker: "start", label: MARKER_LABELS.start },
  ];

  const sorted = [...events].sort((a, b) => {
    const ma = a.minute ?? 9999;
    const mb = b.minute ?? 9999;
    if (ma !== mb) return ma - mb;
    return a.playerName.localeCompare(b.playerName, "ru");
  });

  if (livePhase === "halftime") {
    const firstHalf = sorted.filter((e) => (e.minute ?? 0) <= 45);
    const secondHalf = sorted.filter((e) => (e.minute ?? 0) > 45);
    for (const event of firstHalf) {
      rows.push({ kind: "event", id: event.id, event });
    }
    rows.push({
      kind: "marker",
      id: "marker-halftime",
      marker: "halftime",
      label: MARKER_LABELS.halftime,
    });
    for (const event of secondHalf) {
      rows.push({ kind: "event", id: event.id, event });
    }
  } else {
    for (const event of sorted) {
      rows.push({ kind: "event", id: event.id, event });
    }
  }

  if (finished) {
    rows.push({
      kind: "marker",
      id: "marker-end",
      marker: "end",
      label: MARKER_LABELS.end,
    });
  }

  return rows;
}
