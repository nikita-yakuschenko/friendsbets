import { PredictionReminderKind } from "@/generated/prisma/client";

/** Догоняем «старт матча», если проверка опоздала (до 2 ч после kickoff). */
export const LIVE_REMINDER_CATCHUP_MS = 2 * 60 * 60 * 1000;

/** Горизонт загрузки кандидатов для прематчевых напоминаний (3 ч + запас). */
export const PREMATCH_LOAD_HORIZON_MS = 3 * 60 * 60 * 1000 + 15 * 60 * 1000;

/**
 * Контрольные моменты до старта матча — привязка к startsAt, как у H24 открытия.
 * Каждый kind шлётся один раз после наступления своего дедлайна.
 */
export const MATCH_REMINDER_SCHEDULE = [
  {
    kind: PredictionReminderKind.H3,
    adminKind: PredictionReminderKind.H3_ADMIN,
    minutesBefore: 180,
    label: "3 часа",
    matchStarted: false,
  },
  {
    kind: PredictionReminderKind.H1,
    adminKind: PredictionReminderKind.H1_ADMIN,
    minutesBefore: 60,
    label: "1 час",
    matchStarted: false,
  },
  {
    kind: PredictionReminderKind.M15,
    adminKind: PredictionReminderKind.M15_ADMIN,
    minutesBefore: 15,
    label: "15 минут",
    matchStarted: false,
  },
  {
    kind: PredictionReminderKind.LIVE,
    adminKind: PredictionReminderKind.LIVE_ADMIN,
    minutesBefore: 0,
    label: "старт матча",
    matchStarted: true,
  },
] as const;

export type MatchReminderSlot = (typeof MATCH_REMINDER_SCHEDULE)[number];

/** Контрольное время напоминания относительно запланированного kickoff. */
export function getMatchReminderFireAt(
  startsAt: Date,
  slot: Pick<MatchReminderSlot, "minutesBefore" | "matchStarted">,
): Date {
  if (slot.matchStarted) return startsAt;
  return new Date(startsAt.getTime() - slot.minutesBefore * 60 * 1000);
}

/** Пора слать: дедлайн наступил (догоняем, если опоздали). */
export function isMatchReminderDue(
  now: Date,
  startsAt: Date,
  slot: Pick<MatchReminderSlot, "minutesBefore" | "matchStarted">,
): boolean {
  if (slot.matchStarted) {
    return (
      now.getTime() >= startsAt.getTime() &&
      now.getTime() < startsAt.getTime() + LIVE_REMINDER_CATCHUP_MS
    );
  }
  const fireAt = getMatchReminderFireAt(startsAt, slot);
  return now.getTime() >= fireAt.getTime() && startsAt.getTime() > now.getTime();
}

/** Кандидаты для прематчевых напоминаний (матч ещё не начался). */
export function preMatchReminderCandidateStartsAtRange(now: Date): {
  gt: Date;
  lte: Date;
} {
  return {
    gt: now,
    lte: new Date(now.getTime() + PREMATCH_LOAD_HORIZON_MS),
  };
}

/** Кандидаты для LIVE: только матчи, чей kickoff уже наступил (не раньше!). */
export function liveReminderCandidateStartsAtRange(now: Date): {
  gte: Date;
  lte: Date;
} {
  return {
    gte: new Date(now.getTime() - LIVE_REMINDER_CATCHUP_MS),
    lte: now,
  };
}
