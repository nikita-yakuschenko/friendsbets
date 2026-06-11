import { MatchStatus } from "@/generated/prisma/client";
import {
  daysBeforeKickoffMsk,
  getMskCalendarDateKey,
  getMskMinutesFromMidnight,
  mskDateTimeFromDayAndMinutes,
} from "@/lib/football-api/championat/match-msk-time";
import { isChampionatPostFinishPollPhase } from "@/lib/football-api/championat/championat-tracking";
import {
  isMatchStaleAwaitingResult,
  isMatchWithinLiveTrackingWindow,
} from "@/lib/match-prediction-state";

/** Во время матча и 10 мин после FINISHED — опрос каждые 30 с (cron ≥ 1 мин). */
export const CHAMPIONAT_LIVE_POLL_INTERVAL_MS = 30_000;

/** Повтор опроса «зависшего» матча без счёта в БД. */
export const CHAMPIONAT_STALE_RETRY_MS = 3 * 60 * 1000;

/** Зависший матч, у которого счёт уже есть — опрашиваем чаще. */
export const CHAMPIONAT_STALE_WITH_SCORE_RETRY_MS = 60 * 1000;

/** Окно попадания в слот при cron каждые 5–15 мин. */
export const CHAMPIONAT_SCHEDULED_SLOT_TOLERANCE_MIN = 6;

/**
 * Смещения от времени старта (минуты), эталон — матч в 22:00 МСК:
 * −12 ч, −6 ч, −1 ч, −10 мин, старт.
 */
export const CHAMPIONAT_MATCH_DAY_OFFSETS_MIN = [
  -12 * 60,
  -6 * 60,
  -60,
  -10,
  0,
] as const;

/** За 2 и 1 день до матча: −12 ч и время старта по часам (на том же календарном дне). */
export const CHAMPIONAT_TWO_DAY_POLL_OFFSETS_MIN = [-12 * 60, 0] as const;

export type ChampionatPollScheduleInput = {
  startsAt: Date;
  status: MatchStatus | string;
  championatTrackActive?: boolean | null;
  championatLastSyncAt?: Date | null;
  championatFinishedAt?: Date | null;
  homeScore?: number | null;
  awayScore?: number | null;
  now?: Date;
};

/** Дни 7 / 5 / 3 до матча — опрос раз в 2 суток (календарь МСК). */
export function isChampionatBiDailyPollDay(daysBeforeKickoff: number): boolean {
  if (daysBeforeKickoff < 3 || daysBeforeKickoff > 7) return false;
  return (7 - daysBeforeKickoff) % 2 === 0;
}

/** Минуты от полуночи МСК: время старта + смещение (перенос через полночь). */
export function kickoffWallClockMinutesWithOffset(
  kickoffMinutesFromMidnight: number,
  offsetMinutes: number,
): number {
  let m = kickoffMinutesFromMidnight + offsetMinutes;
  m %= 24 * 60;
  if (m < 0) m += 24 * 60;
  return m;
}

/**
 * Все моменты опроса, попадающие на календарный день pollDayKey (МСК).
 * Слоты считаются от времени старта матча, не от фиксированных 10:00/22:00.
 */
export function getChampionatPollInstantsOnMskDay(
  startsAt: Date,
  pollDayKey: string,
  daysBeforeKickoff: number,
): Date[] {
  const kickoffMin = getMskMinutesFromMidnight(startsAt);

  if (daysBeforeKickoff > 7) {
    return [];
  }

  if (daysBeforeKickoff >= 3 && daysBeforeKickoff <= 7) {
    if (!isChampionatBiDailyPollDay(daysBeforeKickoff)) return [];
    return [mskDateTimeFromDayAndMinutes(pollDayKey, kickoffMin)];
  }

  if (daysBeforeKickoff === 2 || daysBeforeKickoff === 1) {
    const instants: Date[] = [];
    for (const offset of CHAMPIONAT_TWO_DAY_POLL_OFFSETS_MIN) {
      const minutes = kickoffWallClockMinutesWithOffset(kickoffMin, offset);
      const instant = mskDateTimeFromDayAndMinutes(pollDayKey, minutes);
      if (getMskCalendarDateKey(instant) === pollDayKey) {
        instants.push(instant);
      }
    }
    return instants;
  }

  if (daysBeforeKickoff === 0) {
    const kickoffMs = startsAt.getTime();
    return CHAMPIONAT_MATCH_DAY_OFFSETS_MIN.map(
      (offset) => new Date(kickoffMs + offset * 60_000),
    ).filter((instant) => getMskCalendarDateKey(instant) === pollDayKey);
  }

  return [];
}

export function isChampionatLivePollPhase(
  startsAt: Date,
  now: Date,
  status: MatchStatus | string,
): boolean {
  if (status === MatchStatus.FINISHED) return false;
  if (status === MatchStatus.CANCELLED) return false;
  if (now.getTime() < startsAt.getTime()) return false;
  return isMatchWithinLiveTrackingWindow(
    {
      status,
      startsAt,
      homeScore: null,
      awayScore: null,
    },
    now,
  );
}

function isWithinScheduledSlot(
  startsAt: Date,
  now: Date,
  toleranceMin: number,
): boolean {
  const pollDayKey = getMskCalendarDateKey(now);
  const daysBefore = daysBeforeKickoffMsk(now, startsAt);
  const instants = getChampionatPollInstantsOnMskDay(
    startsAt,
    pollDayKey,
    daysBefore,
  );
  const toleranceMs = toleranceMin * 60_000;
  return instants.some(
    (instant) => Math.abs(now.getTime() - instant.getTime()) <= toleranceMs,
  );
}

/** Нужно ли сейчас опрашивать страницу матча на Championat. */
export function shouldPollChampionatMatchNow(
  input: ChampionatPollScheduleInput,
): boolean {
  const now = input.now ?? new Date();

  if (input.championatTrackActive === false) return false;
  if (input.status === MatchStatus.CANCELLED) return false;

  const stale = isMatchStaleAwaitingResult(
    {
      status: input.status,
      startsAt: input.startsAt,
      homeScore: input.homeScore ?? null,
      awayScore: input.awayScore ?? null,
    },
    now,
  );
  if (stale) {
    const last = input.championatLastSyncAt?.getTime() ?? 0;
    const hasScore =
      input.homeScore !== null &&
      input.homeScore !== undefined &&
      input.awayScore !== null &&
      input.awayScore !== undefined;
    const retryMs = hasScore
      ? CHAMPIONAT_STALE_WITH_SCORE_RETRY_MS
      : CHAMPIONAT_STALE_RETRY_MS;
    return now.getTime() - last >= retryMs;
  }

  const needsFastPoll =
    isChampionatLivePollPhase(input.startsAt, now, input.status) ||
    isChampionatPostFinishPollPhase(
      input.status,
      input.championatFinishedAt,
      now,
    );

  if (needsFastPoll) {
    const last = input.championatLastSyncAt?.getTime() ?? 0;
    return now.getTime() - last >= CHAMPIONAT_LIVE_POLL_INTERVAL_MS - 2_000;
  }

  return isWithinScheduledSlot(
    input.startsAt,
    now,
    CHAMPIONAT_SCHEDULED_SLOT_TOLERANCE_MIN,
  );
}
