import {
  getMskCalendarDateKey,
  getMskMinutesFromMidnight,
  mskDateTimeFromDayAndMinutes,
} from "@/lib/football-api/championat/match-msk-time";

/** Матчи с 21:50 до 08:00 МСК (включительно). */
export const NIGHT_KICKOFF_START_MIN = 21 * 60 + 50;
export const NIGHT_KICKOFF_END_MIN = 8 * 60;
export const NIGHT_REMINDER_MSK_MIN = 18 * 60;

export function isNightWindowKickoffMsk(startsAt: Date): boolean {
  const minutes = getMskMinutesFromMidnight(startsAt);
  return (
    minutes >= NIGHT_KICKOFF_START_MIN || minutes <= NIGHT_KICKOFF_END_MIN
  );
}

export function previousMskDateKey(dateKey: string): string {
  const anchor = mskDateTimeFromDayAndMinutes(dateKey, 12 * 60);
  return getMskCalendarDateKey(
    new Date(anchor.getTime() - 24 * 60 * 60 * 1000),
  );
}

/**
 * Момент отправки напоминания (18:00 МСК):
 * - kickoff 22:00–23:59 или 21:50–21:59 → 18:00 в день матча;
 * - kickoff 00:00–08:00 → 18:00 в предыдущий календарный день.
 */
export function getNightReminderFireAt(startsAt: Date): Date | null {
  if (!isNightWindowKickoffMsk(startsAt)) return null;

  const kickMin = getMskMinutesFromMidnight(startsAt);
  const kickDay = getMskCalendarDateKey(startsAt);

  let fireDay: string;
  if (kickMin >= 22 * 60 || kickMin >= NIGHT_KICKOFF_START_MIN) {
    fireDay = kickDay;
  } else if (kickMin <= NIGHT_KICKOFF_END_MIN) {
    fireDay = previousMskDateKey(kickDay);
  } else {
    return null;
  }

  return mskDateTimeFromDayAndMinutes(fireDay, NIGHT_REMINDER_MSK_MIN);
}

export function isNightReminderDueNow(
  fireAt: Date,
  now: Date,
  toleranceMs: number,
): boolean {
  return Math.abs(now.getTime() - fireAt.getTime()) <= toleranceMs;
}
