import { MatchStatus, PredictionReminderKind } from "@/generated/prisma/client";
import { getEffectiveKickoffAt } from "@/lib/match-kickoff-delay";

/** Матчи в этих статусах не кандидаты на прематчевые напоминания. */
export const PREMATCH_REMINDER_EXCLUDED_STATUSES = [
  MatchStatus.FINISHED,
  MatchStatus.CANCELLED,
  MatchStatus.POSTPONED,
] as const;

/** Прематч: kickoff в будущем; LIVE до старта (ошибка синка) не блокирует H1. */
export function preMatchReminderEligibleStatusFilter() {
  return { notIn: [...PREMATCH_REMINDER_EXCLUDED_STATUSES] };
}

/** Догоняем «старт матча», если проверка опоздала (до 2 ч после kickoff). */
export const LIVE_REMINDER_CATCHUP_MS = 2 * 60 * 60 * 1000;

/** Горизонт загрузки кандидатов для прематчевых напоминаний (1 ч + запас на cron). */
export const PREMATCH_LOAD_HORIZON_MS = 60 * 60 * 1000 + 15 * 60 * 1000;

/**
 * Контрольные моменты до старта матча — привязка к startsAt, как у H24 открытия.
 * Каждый kind шлётся один раз после наступления своего дедлайна.
 */
export const MATCH_REMINDER_SCHEDULE = [
  {
    kind: PredictionReminderKind.H1,
    minutesBefore: 60,
    label: "1 час",
    matchStarted: false,
  },
  {
    kind: PredictionReminderKind.LIVE,
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
  if (slot.matchStarted) return getEffectiveKickoffAt(startsAt);
  return new Date(startsAt.getTime() - slot.minutesBefore * 60 * 1000);
}

/** Пора слать: дедлайн наступил (догоняем, если опоздали). */
export function isMatchReminderDue(
  now: Date,
  startsAt: Date,
  slot: Pick<MatchReminderSlot, "minutesBefore" | "matchStarted">,
): boolean {
  if (slot.matchStarted) {
    const effectiveKickoff = getEffectiveKickoffAt(startsAt);
    return (
      now.getTime() >= effectiveKickoff.getTime() &&
      now.getTime() < effectiveKickoff.getTime() + LIVE_REMINDER_CATCHUP_MS
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
