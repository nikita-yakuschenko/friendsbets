/** Догоняем «старт матча», если проверка опоздала (до 2 ч после kickoff). */
export const LIVE_REMINDER_CATCHUP_MS = 2 * 60 * 60 * 1000;

/** Горизонт загрузки кандидатов для прематчевых напоминаний (3 ч + запас). */
export const PREMATCH_LOAD_HORIZON_MS = 3 * 60 * 60 * 1000 + 15 * 60 * 1000;

export function getPreMatchReminderFireAt(
  startsAt: Date,
  minutesBefore: number,
): Date {
  return new Date(startsAt.getTime() - minutesBefore * 60 * 1000);
}

/** Пора слать прематчевое напоминание: дедлайн наступил, матч ещё не начался. */
export function isPreMatchReminderDue(
  now: Date,
  startsAt: Date,
  minutesBefore: number,
): boolean {
  return (
    now >= getPreMatchReminderFireAt(startsAt, minutesBefore) && startsAt > now
  );
}

/** Пора слать уведомление о старте матча. */
export function isLiveReminderDue(now: Date, startsAt: Date): boolean {
  return (
    now >= startsAt &&
    now.getTime() < startsAt.getTime() + LIVE_REMINDER_CATCHUP_MS
  );
}

/** Диапазон startsAt для загрузки кандидатов в одном тике. */
export function matchReminderCandidateStartsAtRange(now: Date): {
  gte: Date;
  lte: Date;
} {
  return {
    gte: new Date(now.getTime() - LIVE_REMINDER_CATCHUP_MS),
    lte: new Date(now.getTime() + PREMATCH_LOAD_HORIZON_MS),
  };
}
