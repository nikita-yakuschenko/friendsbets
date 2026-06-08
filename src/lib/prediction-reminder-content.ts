import { absoluteAppUrl, getAppOriginFromEnv } from "@/lib/app-origin";
import { escapeHtml } from "@/lib/email/escape";
import {
  buildPredictionReminderEmail,
  type EmailContent,
} from "@/lib/email/templates";
import {
  EMAIL_BRAND,
  renderEmailLayout,
  renderMatchCard,
} from "@/lib/email/layout";
import { gamePath } from "@/lib/game-path";
import { formatDateTimeMoscow, formatRelativeTime } from "@/lib/utils";

import { NOTIFICATION_SIGNOFF } from "@/lib/notification-signoff";
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

/** In-app: приветствие + матч открытия (без URL). */
export function buildOpeningMatchInAppBody(params: {
  gameTitle: string;
  homeTeam: { name: string; countryCode: string | null };
  awayTeam: { name: string; countryCode: string | null };
  startsAt: Date;
}): string {
  const startsAt = new Date(params.startsAt);

  return [
    `Добро пожаловать в турнир «${params.gameTitle}»!`,
    "",
    "Сделай прогноз на матч открытия:",
    formatPredictionMatchLine(params.homeTeam, params.awayTeam),
    `матч начнётся ${formatDateTimeMoscow(startsAt)}`,
    `до начала матча ${formatRelativeTime(startsAt)}`,
    "",
    NOTIFICATION_SIGNOFF,
  ].join("\n");
}

/** Telegram HTML: приветствие при вступлении в турнир. */
export function buildOpeningMatchTelegramPersonalHtml(params: {
  gameTitle: string;
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
    `<b>${escapeHtml(`Добро пожаловать в «${params.gameTitle}»!`)}</b>`,
    "",
    escapeHtml("Сделай прогноз на матч открытия:"),
    escapeHtml(matchLine),
    escapeHtml(`матч начнётся ${formatDateTimeMoscow(startsAt)}`),
    escapeHtml(`до начала матча ${formatRelativeTime(startsAt)}`),
    "",
    telegramHtmlLink(link, PREDICTION_CTA_LABEL),
    "",
    NOTIFICATION_SIGNOFF,
  ].join("\n");
}

type ReminderMatchBlock = {
  homeTeam: { name: string; countryCode: string | null };
  awayTeam: { name: string; countryCode: string | null };
  startsAt: Date;
};

function buildMatchReminderBlocks(matches: ReminderMatchBlock[]): string[] {
  return matches.flatMap((match) => {
    const startsAt = new Date(match.startsAt);
    return [
      formatPredictionMatchLine(match.homeTeam, match.awayTeam),
      `матч начнётся ${formatDateTimeMoscow(startsAt)}`,
      `до начала матча ${formatRelativeTime(startsAt)}`,
      "",
    ];
  });
}

const NIGHT_BATCH_INTRO =
  "Ты не сделал прогноз на предстоящие матчи, не забудь это сделать";

/** Пакетное напоминание в 18:00 МСК для ночных матчей (in-app / email text). */
export function buildNightBatchInAppBody(params: {
  matches: ReminderMatchBlock[];
}): string {
  return [
    NIGHT_BATCH_INTRO,
    "",
    ...buildMatchReminderBlocks(params.matches),
    NOTIFICATION_SIGNOFF,
  ].join("\n");
}

/** Email: пакет ночных матчей (как in-app + CTA-ссылка). */
export function buildNightBatchEmailContent(params: {
  userName: string;
  gameTitle: string;
  matches: ReminderMatchBlock[];
  inviteCode: string;
  origin?: string;
}): EmailContent {
  const link = predictionsAbsoluteUrl(params.inviteCode, params.origin);
  const body = buildNightBatchInAppBody({ matches: params.matches });
  const text = [
    `Привет, ${params.userName}!`,
    "",
    body,
    "",
    `${PREDICTION_CTA_LABEL}: ${link}`,
    "",
    NOTIFICATION_SIGNOFF,
  ].join("\n");

  const blocksHtml = params.matches
    .map((match) => {
      const startsAt = new Date(match.startsAt);
      return renderMatchCard({
        homeTeam: match.homeTeam.name,
        awayTeam: match.awayTeam.name,
        gameTitle: params.gameTitle,
        startsAtLabel: formatDateTimeMoscow(startsAt),
        timeLabel: formatRelativeTime(startsAt),
      });
    })
    .join("");

  const html = renderEmailLayout({
    preheader: NIGHT_BATCH_INTRO,
    badge: "Напоминание · 18:00",
    title: "Прогноз на предстоящие матчи",
    introHtml: `
      <p style="margin:0 0 14px;">Привет, <strong style="color:${EMAIL_BRAND.heading};font-weight:600;">${escapeHtml(params.userName)}</strong>!</p>
      <p style="margin:0;">${escapeHtml(NIGHT_BATCH_INTRO)}</p>`,
    blocksHtml,
    cta: { label: PREDICTION_CTA_LABEL, href: link },
    footnote:
      "Письмо отправлено автоматически в 18:00 по московскому времени.",
  });

  return { text, html };
}

/** Telegram HTML: пакет ночных матчей. */
export function buildNightBatchTelegramPersonalHtml(params: {
  matches: ReminderMatchBlock[];
  inviteCode: string;
  origin?: string;
}): string {
  const link = predictionsAbsoluteUrl(params.inviteCode, params.origin);
  const blocks = params.matches.flatMap((match) => {
    const startsAt = new Date(match.startsAt);
    return [
      escapeHtml(formatPredictionMatchLine(match.homeTeam, match.awayTeam)),
      escapeHtml(`матч начнётся ${formatDateTimeMoscow(startsAt)}`),
      escapeHtml(`до начала матча ${formatRelativeTime(startsAt)}`),
      "",
    ];
  });

  return [
    `<b>${escapeHtml(NIGHT_BATCH_INTRO)}</b>`,
    "",
    ...blocks,
    telegramHtmlLink(link, PREDICTION_CTA_LABEL),
    "",
    NOTIFICATION_SIGNOFF,
  ].join("\n");
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
    NOTIFICATION_SIGNOFF,
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
    NOTIFICATION_SIGNOFF,
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
    `${cta}\n\n` +
    NOTIFICATION_SIGNOFF
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
