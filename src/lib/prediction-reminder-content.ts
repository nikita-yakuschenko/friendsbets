import { absoluteAppUrl, getAppOriginFromEnv } from "@/lib/app-origin";
import { escapeHtml } from "@/lib/email/escape";
import { buildPredictionReminderEmail } from "@/lib/email/templates";
import { gamePath } from "@/lib/game-path";
import { formatDateTimeMoscow, formatRelativeTime } from "@/lib/utils";

import { PREDICTION_CTA_LABEL } from "@/lib/prediction-cta";

export { PREDICTION_CTA_LABEL } from "@/lib/prediction-cta";

export function predictionsAbsoluteUrl(
  inviteCode: string,
  origin?: string,
): string {
  return absoluteAppUrl(gamePath(inviteCode, "predictions"), origin);
}

function countryCodeToFlagEmoji(code: string | null | undefined): string {
  if (!code || code.length !== 2) return "";
  const upper = code.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(upper)) return "";
  return String.fromCodePoint(
    ...[...upper].map((char) => 0x1f1e6 + char.charCodeAt(0) - 65),
  );
}

export function formatPredictionMatchLine(
  home: { name: string; countryCode: string | null },
  away: { name: string; countryCode: string | null },
): string {
  const homeFlag = countryCodeToFlagEmoji(home.countryCode);
  const awayFlag = countryCodeToFlagEmoji(away.countryCode);
  const homePart = homeFlag ? `${home.name} ${homeFlag}` : home.name;
  const awayPart = awayFlag ? `${awayFlag} ${away.name}` : away.name;
  return `${homePart} - ${awayPart}`;
}

/** Текст для раздела «Уведомления» на сайте (без URL). */
export function buildMissingPredictionInAppBody(params: {
  homeTeam: { name: string; countryCode: string | null };
  awayTeam: { name: string; countryCode: string | null };
  startsAt: Date;
}): string {
  const startsAt = new Date(params.startsAt);

  return [
    "Ты не сделал прогноз на матч",
    formatPredictionMatchLine(params.homeTeam, params.awayTeam),
    `матч начнётся ${formatDateTimeMoscow(startsAt)}`,
    `до начала матча ${formatRelativeTime(startsAt)}`,
    "",
    "Твоя команда FriendsBets 💚",
  ].join("\n");
}

/** Текст для копирования организатором (с подписанной ссылкой). */
export function buildMissingPredictionCopyText(params: {
  homeTeam: { name: string; countryCode: string | null };
  awayTeam: { name: string; countryCode: string | null };
  startsAt: Date;
  inviteCode: string;
  origin?: string;
}): string {
  const link = predictionsAbsoluteUrl(params.inviteCode, params.origin);
  return [
    buildMissingPredictionInAppBody(params),
    "",
    `${PREDICTION_CTA_LABEL}: ${link}`,
  ].join("\n");
}

export function buildMissingPredictionEmailContent(params: {
  userName: string;
  homeTeam: string;
  awayTeam: string;
  gameTitle: string;
  startsAt: Date;
  inviteCode: string;
  timeLabel?: string;
  origin?: string;
}) {
  const startsAt = new Date(params.startsAt);
  const timeLabel =
    params.timeLabel ?? formatRelativeTime(startsAt);
  const link = predictionsAbsoluteUrl(params.inviteCode, params.origin);

  return buildPredictionReminderEmail({
    userName: params.userName,
    homeTeam: params.homeTeam,
    awayTeam: params.awayTeam,
    gameTitle: params.gameTitle,
    startsAtLabel: formatDateTimeMoscow(startsAt),
    timeLabel,
    link,
  });
}

function telegramHtmlLink(href: string, label: string): string {
  const safeHref = href.replace(/"/g, "%22");
  return `<a href="${safeHref}">${escapeHtml(label)}</a>`;
}

/**
 * Telegram (ручная рассылка / in-app тот же текст): жирный заголовок, флаги, отступы, 💚, CTA-ссылка.
 */
export function buildMissingPredictionTelegramPersonalHtml(params: {
  homeTeam: { name: string; countryCode: string | null };
  awayTeam: { name: string; countryCode: string | null };
  startsAt: Date;
  inviteCode: string;
  origin?: string;
}): string {
  const link = predictionsAbsoluteUrl(params.inviteCode, params.origin);
  const startsAt = new Date(params.startsAt);
  const matchLine = formatPredictionMatchLine(params.homeTeam, params.awayTeam);

  return [
    `<b>${escapeHtml("Ты не сделал прогноз на матч")}</b>`,
    escapeHtml(matchLine),
    escapeHtml(`матч начнётся ${formatDateTimeMoscow(startsAt)}`),
    escapeHtml(`до начала матча ${formatRelativeTime(startsAt)}`),
    "",
    telegramHtmlLink(link, PREDICTION_CTA_LABEL),
    "",
    "Твоя команда FriendsBets 💚",
  ].join("\n");
}

/** Telegram (cron): краткое напоминание с именем и турниром. */
export function buildMissingPredictionTelegramHtml(params: {
  displayName: string;
  homeTeam: string;
  awayTeam: string;
  gameTitle: string;
  startsAt: Date;
  timeLabel: string;
  inviteCode: string;
  origin?: string;
}): string {
  const link = predictionsAbsoluteUrl(params.inviteCode, params.origin);
  const startsAtLabel = formatDateTimeMoscow(new Date(params.startsAt));
  const cta = telegramHtmlLink(link, PREDICTION_CTA_LABEL);

  return (
    `⏰ ${escapeHtml(params.displayName)}, через ${escapeHtml(params.timeLabel)} матч ` +
    `${escapeHtml(params.homeTeam)} — ${escapeHtml(params.awayTeam)} ` +
    `(турнир «${escapeHtml(params.gameTitle)}», ${escapeHtml(startsAtLabel)}).\n` +
    `Вы ещё не сделали прогноз.\n` +
    cta
  );
}

/** @deprecated Используйте buildMissingPredictionInAppBody / buildMissingPredictionCopyText */
export function buildMissingPredictionReminderText(params: {
  homeTeam: { name: string; countryCode: string | null };
  awayTeam: { name: string; countryCode: string | null };
  startsAt: Date;
  inviteCode: string;
  origin?: string;
}): string {
  return buildMissingPredictionCopyText(params);
}

export function predictionsLinkFromEnv(inviteCode: string): string {
  const origin = getAppOriginFromEnv().replace(/\/$/, "");
  return `${origin}${gamePath(inviteCode, "predictions")}`;
}
