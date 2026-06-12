import type { ChampionatLiveStatus } from "@/lib/football-api/championat/match-live-status";
import type { ChampionatMatchEvent } from "@/lib/football-api/championat/match-protocol-types";
import { sortChampionatMatchEventsByMinute } from "@/lib/football-api/championat/match-minute-sort";
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
  const sorted = sortChampionatMatchEventsByMinute(events);

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

function eventSnapshotKey(event: ChampionatMatchEvent): string {
  return [
    event.id,
    event.type,
    event.section,
    event.minute ?? "",
    event.minuteLabel,
    event.playerName,
    event.assistName ?? "",
    event.score ?? "",
    event.teamSide ?? "",
  ].join("|");
}

/** Сравнивает списки событий без обращения к БД. */
export function championatMatchEventsEqual(
  left: ChampionatMatchEvent[],
  right: ChampionatMatchEvent[],
): boolean {
  if (left.length !== right.length) return false;
  const leftKeys = left.map(eventSnapshotKey).sort();
  const rightKeys = right.map(eventSnapshotKey).sort();
  return leftKeys.every((key, index) => key === rightKeys[index]);
}

/** Сохраняет события протокола (upsert; старые ключи удаляются). */
export async function persistChampionatMatchEvents(
  matchId: string,
  events: ChampionatMatchEvent[],
): Promise<void> {
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

/** Удаляет устаревшие события из горизонтального таймлайна (до перехода на протокол). */
export async function removeLegacyTimelineMatchEvents(
  matchId: string,
): Promise<number> {
  const result = await prisma.matchEvent.deleteMany({
    where: {
      matchId,
      externalKey: { startsWith: "tl-" },
    },
  });
  return result.count;
}

/** Записывает события только если снимок изменился. Пустой протокол не затирает БД. */
export async function persistChampionatMatchEventsIfChanged(
  matchId: string,
  events: ChampionatMatchEvent[],
): Promise<boolean> {
  if (events.length === 0) return false;

  const existing = await loadChampionatMatchEventsFromDb(matchId);
  if (championatMatchEventsEqual(existing, events)) return false;

  await persistChampionatMatchEvents(matchId, events);
  return true;
}

function liveStatusCacheEqual(
  stored: {
    liveMinute: number | null;
    livePhaseCache: string | null;
    liveStatusRaw: string | null;
  },
  liveStatus: ChampionatLiveStatus,
): boolean {
  return (
    (stored.liveMinute ?? null) === (liveStatus.minute ?? null) &&
    (stored.livePhaseCache ?? null) === liveStatus.phase &&
    (stored.liveStatusRaw ?? "") === (liveStatus.rawText || "")
  );
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

/** Обновляет кэш табло только при изменении строки статуса / фазы / минуты. */
export async function persistMatchLiveStatusCacheIfChanged(
  matchId: string,
  liveStatus: ChampionatLiveStatus,
): Promise<boolean> {
  const stored = await prisma.match.findUnique({
    where: { id: matchId },
    select: {
      liveMinute: true,
      livePhaseCache: true,
      liveStatusRaw: true,
    },
  });
  if (!stored) return false;
  if (liveStatusCacheEqual(stored, liveStatus)) return false;

  await persistMatchLiveStatusCache(matchId, liveStatus);
  return true;
}
