const HOUR_MS = 60 * 60 * 1000;
const MIN_10_MS = 10 * 60 * 1000;
const MIN_1_MS = 60 * 1000;
const SEC_5_MS = 5 * 1000;
const SEC_1_MS = 1000;

/** Интервал до следующей проверки напоминаний по близости контрольного времени. */
export function computeAdaptiveReminderPollDelayMs(
  now: Date,
  nextFireAt: Date | null,
): number {
  if (!nextFireAt) return HOUR_MS;

  const msUntil = nextFireAt.getTime() - now.getTime();
  if (msUntil <= 0) return 0;
  if (msUntil > HOUR_MS) return HOUR_MS;
  if (msUntil > MIN_10_MS) return MIN_10_MS;
  if (msUntil > MIN_1_MS) return MIN_1_MS;
  if (msUntil > SEC_5_MS) return SEC_5_MS;
  return SEC_1_MS;
}
