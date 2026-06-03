const MSK_TIME_ZONE = "Europe/Moscow";
const MSK_OFFSET_MS = 3 * 60 * 60 * 1000;

/** Календарная дата в МСК (YYYY-MM-DD). */
export function getMskCalendarDateKey(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: MSK_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/** Минуты от полуночи по МСК (0–1439). */
export function getMskMinutesFromMidnight(date: Date): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: MSK_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? 0);
  const minute = Number(parts.find((p) => p.type === "minute")?.value ?? 0);
  return hour * 60 + minute;
}

function mskDateKeyToUtcMs(dateKey: string): number {
  const [y, m, d] = dateKey.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

/** Момент времени: календарный день МСК + минуты от полуночи МСК. */
export function mskDateTimeFromDayAndMinutes(
  dateKey: string,
  minutesFromMidnight: number,
): Date {
  const [y, m, d] = dateKey.split("-").map(Number);
  return new Date(
    Date.UTC(y, m - 1, d) - MSK_OFFSET_MS + minutesFromMidnight * 60_000,
  );
}

/** Сколько полных календарных дней в МСК до дня начала матча (0 = день матча). */
export function daysBeforeKickoffMsk(now: Date, startsAt: Date): number {
  const nowKey = getMskCalendarDateKey(now);
  const kickKey = getMskCalendarDateKey(startsAt);
  const diffMs = mskDateKeyToUtcMs(kickKey) - mskDateKeyToUtcMs(nowKey);
  return Math.round(diffMs / 86_400_000);
}
