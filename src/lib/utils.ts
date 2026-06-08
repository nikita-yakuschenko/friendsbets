import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDateTime(date: Date): string {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function formatDateTimeWithYear(date: Date): string {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

/** Полная дата и время по часовому поясу Москвы. */
export function formatDateTimeMoscow(date: Date): string {
  const formatted = new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Moscow",
  }).format(date);
  return `${formatted} МСК`;
}

export function formatRelativeTime(until: Date): string {
  const diffMs = until.getTime() - Date.now();
  if (diffMs <= 0) return "уже начался";

  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

  if (hours >= 24) {
    const days = Math.floor(hours / 24);
    return `${days} д. ${hours % 24} ч.`;
  }
  if (hours > 0) return `${hours} ч. ${minutes} мин.`;
  return `${minutes} мин.`;
}

/** «до начала N часов» для Telegram-уведомлений. */
export function formatHoursUntilStart(until: Date): string {
  const diffMs = until.getTime() - Date.now();
  if (diffMs <= 0) return "матч уже идёт";

  const totalMinutes = Math.ceil(diffMs / (1000 * 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours >= 24) {
    const days = Math.floor(hours / 24);
    const remHours = hours % 24;
    if (remHours === 0) {
      return `${days} ${pluralRu(days, "день", "дня", "дней")}`;
    }
    return `${days} ${pluralRu(days, "день", "дня", "дней")} ${remHours} ${pluralRu(remHours, "час", "часа", "часов")}`;
  }
  if (hours > 0 && minutes > 0) {
    return `${hours} ${pluralRu(hours, "час", "часа", "часов")} ${minutes} мин.`;
  }
  if (hours > 0) {
    return `${hours} ${pluralRu(hours, "час", "часа", "часов")}`;
  }
  return `${minutes} мин.`;
}

function pluralRu(n: number, one: string, few: string, many: string): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return few;
  return many;
}

export function isMatchLocked(startsAt: Date): boolean {
  return startsAt.getTime() <= Date.now();
}

export function deriveWinnerTeamId(
  homeScore: number,
  awayScore: number,
  homeTeamId: string,
  awayTeamId: string,
): string | null {
  if (homeScore > awayScore) return homeTeamId;
  if (awayScore > homeScore) return awayTeamId;
  return null;
}

export function deriveMatchWinnerTeamId(
  match: {
    homeScore: number | null;
    awayScore: number | null;
    homeTeamId: string;
    awayTeamId: string;
    winnerTeamId: string | null;
  },
): string | null {
  if (match.winnerTeamId) return match.winnerTeamId;
  if (match.homeScore === null || match.awayScore === null) return null;
  return deriveWinnerTeamId(
    match.homeScore,
    match.awayScore,
    match.homeTeamId,
    match.awayTeamId,
  );
}
