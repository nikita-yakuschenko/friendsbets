import {
  getMskCalendarDateKey,
  mskDateTimeFromDayAndMinutes,
} from "@/lib/football-api/championat/match-msk-time";
import { previousMskDateKey } from "@/lib/reminders/night-match-schedule";

/** Стартовое уведомление: 22:35 МСК в календарный день перед матчем открытия. */
export const OPENING_H24_MSK_MIN = 22 * 60 + 35;

/**
 * Контрольное время стартового уведомления.
 * Пример: матч 11 июля 22:00 МСК → отправка 10 июля 22:35 МСК.
 */
export function getOpeningH24FireAt(startsAt: Date): Date {
  const kickDay = getMskCalendarDateKey(startsAt);
  const fireDay = previousMskDateKey(kickDay);
  return mskDateTimeFromDayAndMinutes(fireDay, OPENING_H24_MSK_MIN);
}

/** Пора слать: контрольное время наступило, матч ещё не начался. */
export function isOpeningH24Due(now: Date, startsAt: Date): boolean {
  return now >= getOpeningH24FireAt(startsAt) && startsAt > now;
}
