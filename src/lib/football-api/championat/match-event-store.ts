import type { ChampionatLiveStatus } from "@/lib/football-api/championat/match-live-status";
import type { ChampionatMatchEvent } from "@/lib/football-api/championat/match-protocol-types";
import { prisma } from "@/lib/db";

export function championatEventsToDbRows(
  matchId: string,
  events: ChampionatMatchEvent[],
): Array<{
  matchId: string;
  externalKey: string;
  type: string;
  section: string;
  minute: number | null;
  minuteLabel: string;
  playerName: string;
  assistName: string | null;
  score: string | null;
  teamSide: string | null;
  sortOrder: number;
}> {
  const sorted = [...events].sort((a, b) => {
    const ma = a.minute ?? 9999;
    const mb = b.minute ?? 9999;
    if (ma !== mb) return ma - mb;
    return a.playerName.localeCompare(b.playerName, "ru");
  });

  return sorted.map((event, index) => ({
    matchId,
    externalKey: event.id,
    type: event.type,
    section: event.section,
    minute: event.minute,
    minuteLabel: event.minuteLabel,
    playerName: event.playerName,
    assistName: event.assistName ?? null,
    score: event.score ?? null,
    teamSide: event.teamSide ?? null,
    sortOrder: index,
  }));
}

export function dbRowToChampionatEvent(row: {
  externalKey: string;
  type: string;
  section: string;
  minute: number | null;
  minuteLabel: string;
  playerName: string;
  assistName: string | null;
  score: string | null;
  teamSide: string | null;
}): ChampionatMatchEvent {
  return {
    id: row.externalKey,
    type: row.type as ChampionatMatchEvent["type"],
    section: row.section as ChampionatMatchEvent["section"],
    minute: row.minute,
    minuteLabel: row.minuteLabel,
    playerName: row.playerName,
    assistName: row.assistName ?? undefined,
    score: row.score ?? undefined,
    teamSide: (row.teamSide as ChampionatMatchEvent["teamSide"]) ?? undefined,
  };
}

/** Сохраняет события протокола (upsert; старые ключи удаляются). */
export async function persistChampionatMatchEvents(
  matchId: string,
  events: ChampionatMatchEvent[],
): Promise<void> {
  if (events.length === 0) return;

  const rows = championatEventsToDbRows(matchId, events);
  const keys = rows.map((row) => row.externalKey);

  await prisma.$transaction(async (tx) => {
    for (const row of rows) {
      await tx.matchEvent.upsert({
        where: {
          matchId_externalKey: {
            matchId: row.matchId,
            externalKey: row.externalKey,
          },
        },
        create: row,
        update: {
          type: row.type,
          section: row.section,
          minute: row.minute,
          minuteLabel: row.minuteLabel,
          playerName: row.playerName,
          assistName: row.assistName,
          score: row.score,
          teamSide: row.teamSide,
          sortOrder: row.sortOrder,
        },
      });
    }

    await tx.matchEvent.deleteMany({
      where: {
        matchId,
        externalKey: { notIn: keys },
      },
    });

    await tx.match.update({
      where: { id: matchId },
      data: { eventsSyncedAt: new Date() },
    });
  });
}

export async function loadChampionatMatchEventsFromDb(
  matchId: string,
): Promise<ChampionatMatchEvent[]> {
  const rows = await prisma.matchEvent.findMany({
    where: { matchId },
    orderBy: { sortOrder: "asc" },
  });
  return rows.map(dbRowToChampionatEvent);
}

export async function persistMatchLiveStatusCache(
  matchId: string,
  liveStatus: ChampionatLiveStatus,
): Promise<void> {
  await prisma.match.update({
    where: { id: matchId },
    data: {
      liveMinute: liveStatus.minute ?? null,
      livePhaseCache: liveStatus.phase,
      liveStatusRaw: liveStatus.rawText || null,
    },
  });
}
