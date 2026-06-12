import { MatchStatus } from "@/generated/prisma/client";
import { isMatchPredictable } from "@/lib/football-api/match-visibility";
import { prisma } from "@/lib/db";
import {
  getMatchReminderFireAt,
  LIVE_REMINDER_CATCHUP_MS,
  MATCH_REMINDER_SCHEDULE,
} from "@/lib/reminders/match-reminder-schedule";
import { getNightReminderFireAt } from "@/lib/reminders/night-match-schedule";
import { getOpeningH24FireAt } from "@/lib/reminders/opening-match-h24-schedule";
import { findOpeningMatchForTournament } from "@/lib/tournament-opening-reminder";

const LOOKAHEAD_MS = 8 * 24 * 60 * 60 * 1000;

function trackNearest(
  nearest: Date | null,
  fireAt: Date,
  now: Date,
): Date | null {
  if (fireAt <= now) return now;
  if (!nearest || fireAt < nearest) return fireAt;
  return nearest;
}

/** Ближайшее контрольное время любого напоминания (для адаптивного polling). */
export async function getNearestReminderFireAt(
  now: Date,
): Promise<Date | null> {
  const matches = await prisma.match.findMany({
    where: {
      status: { in: [MatchStatus.SCHEDULED, MatchStatus.LIVE] },
      startsAt: {
        gt: new Date(now.getTime() - LIVE_REMINDER_CATCHUP_MS),
        lte: new Date(now.getTime() + LOOKAHEAD_MS),
      },
    },
    select: {
      id: true,
      tournamentId: true,
      startsAt: true,
      homeTeam: { select: { externalId: true } },
      awayTeam: { select: { externalId: true } },
    },
    orderBy: { startsAt: "asc" },
    take: 120,
  });

  let nearest: Date | null = null;

  for (const match of matches) {
    if (!isMatchPredictable(match)) continue;

    for (const slot of MATCH_REMINDER_SCHEDULE) {
      nearest = trackNearest(
        nearest,
        getMatchReminderFireAt(match.startsAt, slot),
        now,
      );
    }

    const nightFire = getNightReminderFireAt(match.startsAt);
    if (nightFire) nearest = trackNearest(nearest, nightFire, now);

    const opening = await findOpeningMatchForTournament(match.tournamentId);
    if (opening?.id === match.id) {
      nearest = trackNearest(nearest, getOpeningH24FireAt(match.startsAt), now);
    }
  }

  return nearest;
}
