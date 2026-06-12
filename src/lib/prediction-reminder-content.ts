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
import {
  buildTelegramBatchNotificationHtml,
  buildTelegramNotificationHtml,
} from "@/lib/telegram/notification-layout";
import { formatDateTimeMoscow, formatRelativeTime } from "@/lib/utils";

import { NOTIFICATION_SIGNOFF } from "@/lib/notification-signoff";
import { PREDICTION_CTA_LABEL } from "@/lib/prediction-cta";
import { joinTournamentNotificationBody } from "@/lib/tournament-notification-lead";

export { PREDICTION_CTA_LABEL } from "@/lib/prediction-cta";

export function predictionsAbsoluteUrl(
  inviteCode: string,
  origin?: string,
): string {
  return absoluteAppUrl(gamePath(inviteCode, "predictions"), origin);
}

/** Текст уведомлений: без флагов — в Telegram они часто рендерятся как «ca - ва». */
export function formatPredictionMatchLine(
  home: { name: string; countryCode: string | null },
  away: { name: string; countryCode: string | null },
): string {
  return `${home.name} — ${away.name}`;
}

/** In-app: приветствие + матч открытия (без URL). */
export function buildOpeningMatchInAppBody(params: {
  gameTitle: string;
  homeTeam: { name: string; countryCode: string | null };
  awayTeam: { name: string; countryCode: string | null };
  startsAt: Date;
}): string {
  const startsAt = new Date(params.startsAt);

  return joinTournamentNotificationBody(params.gameTitle, [
    `Добро пожаловать в турнир «${params.gameTitle}»!`,
    "",
    "Сделай прогноз на матч открытия:",
    formatPredictionMatchLine(params.homeTeam, params.awayTeam),
    `матч начнётся ${formatDateTimeMoscow(startsAt)}`,
    `до начала матча ${formatRelativeTime(startsAt)}`,
    "",
    NOTIFICATION_SIGNOFF,
  ]);
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
  return buildTelegramNotificationHtml({
    gameTitle: params.gameTitle,
    eventLine: `Добро пожаловать в «${params.gameTitle}»! Сделай прогноз на матч открытия:`,
    eventBold: true,
    teams: {
      homeTeam: params.homeTeam,
      awayTeam: params.awayTeam,
    },
    detailLine: "",
    schedule: { startsAt: params.startsAt },
    inviteCode: params.inviteCode,
    origin: params.origin,
  });
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
  gameTitle: string;
  matches: ReminderMatchBlock[];
}): string {
  return joinTournamentNotificationBody(params.gameTitle, [
    NIGHT_BATCH_INTRO,
    "",
    ...buildMatchReminderBlocks(params.matches),
    NOTIFICATION_SIGNOFF,
  ]);
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
  const body = buildNightBatchInAppBody({
    gameTitle: params.gameTitle,
    matches: params.matches,
  });
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
  gameTitle: string;
  matches: ReminderMatchBlock[];
  inviteCode: string;
  origin?: string;
}): string {
  return buildTelegramBatchNotificationHtml({
    gameTitle: params.gameTitle,
    eventLine: NIGHT_BATCH_INTRO,
    matches: params.matches,
    inviteCode: params.inviteCode,
    origin: params.origin,
  });
}

/** In-app: матч начался (всем участникам игры). */
export function buildMatchStartedInAppBody(params: {
  gameTitle: string;
  homeTeam: { name: string; countryCode: string | null };
  awayTeam: { name: string; countryCode: string | null };
  predictedHome?: number | null;
  predictedAway?: number | null;
}): string {
  const detail =
    params.predictedHome != null && params.predictedAway != null
      ? `Твой прогноз: ${params.predictedHome}:${params.predictedAway}`
      : "Прогноз не сделан";

  return joinTournamentNotificationBody(params.gameTitle, [
    "Матч начался:",
    formatPredictionMatchLine(params.homeTeam, params.awayTeam),
    detail,
    "",
    NOTIFICATION_SIGNOFF,
  ]);
}

export function buildMatchStartedEmailContent(params: {
  userName: string;
  gameTitle: string;
  homeTeam: string;
  awayTeam: string;
  inviteCode: string;
  predictedHome?: number | null;
  predictedAway?: number | null;
  origin?: string;
}): EmailContent {
  const link = predictionsAbsoluteUrl(params.inviteCode, params.origin);
  const detail =
    params.predictedHome != null && params.predictedAway != null
      ? `Твой прогноз: ${params.predictedHome}:${params.predictedAway}`
      : "Прогноз не сделан";

  const text = [
    `Здравствуйте, ${params.userName}!`,
    "",
    `В турнире «${params.gameTitle}» начался матч ${params.homeTeam} — ${params.awayTeam}.`,
    detail,
    "",
    `${PREDICTION_CTA_LABEL}: ${link}`,
    "",
    NOTIFICATION_SIGNOFF,
  ].join("\n");

  const html = renderEmailLayout({
    preheader: `Матч начался: ${params.homeTeam} — ${params.awayTeam}`,
    badge: params.gameTitle,
    title: "Матч начался",
    introHtml: `
      <p style="margin:0 0 14px;">Здравствуйте, <strong style="color:${EMAIL_BRAND.heading};font-weight:600;">${escapeHtml(params.userName)}</strong>!</p>
      <p style="margin:0 0 14px;">В турнире «${escapeHtml(params.gameTitle)}» начался матч:</p>
      ${renderMatchCard({
        homeTeam: params.homeTeam,
        awayTeam: params.awayTeam,
        gameTitle: params.gameTitle,
        startsAtLabel: "сейчас",
      })}
      <p style="margin:14px 0 0;">${escapeHtml(detail)}</p>`,
    cta: { label: PREDICTION_CTA_LABEL, href: link },
  });

  return { text, html };
}

/** Текст для раздела «Уведомления» на сайте (без URL). */
export function buildMissingPredictionInAppBody(params: {
  gameTitle: string;
  homeTeam: { name: string; countryCode: string | null };
  awayTeam: { name: string; countryCode: string | null };
  startsAt: Date;
}): string {
  const startsAt = new Date(params.startsAt);

  return joinTournamentNotificationBody(params.gameTitle, [
    "Ты не сделал прогноз на матч",
    formatPredictionMatchLine(params.homeTeam, params.awayTeam),
    `матч начнётся ${formatDateTimeMoscow(startsAt)}`,
    `до начала матча ${formatRelativeTime(startsAt)}`,
    "",
    NOTIFICATION_SIGNOFF,
  ]);
}

/** Текст для копирования организатором (с подписанной ссылкой). */
export function buildMissingPredictionCopyText(params: {
  gameTitle: string;
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

/**
 * Telegram (ручная рассылка / in-app тот же текст): жирный заголовок, флаги, отступы, 💚, CTA-ссылка.
 */
export function buildMissingPredictionTelegramPersonalHtml(params: {
  gameTitle: string;
  homeTeam: { name: string; countryCode: string | null };
  awayTeam: { name: string; countryCode: string | null };
  startsAt: Date;
  inviteCode: string;
  origin?: string;
}): string {
  return buildTelegramNotificationHtml({
    gameTitle: params.gameTitle,
    eventLine: "Ты не сделал прогноз на матч",
    eventBold: true,
    teams: {
      homeTeam: params.homeTeam,
      awayTeam: params.awayTeam,
    },
    detailLine: "",
    schedule: { startsAt: params.startsAt },
    inviteCode: params.inviteCode,
    origin: params.origin,
  });
}

/** Telegram (cron): краткое напоминание с именем и турниром. */
export function buildMissingPredictionTelegramHtml(params: {
  gameTitle: string;
  homeTeam: { name: string; countryCode: string | null };
  awayTeam: { name: string; countryCode: string | null };
  startsAt: Date;
  timeLabel: string;
  inviteCode: string;
  origin?: string;
}): string {
  return buildTelegramNotificationHtml({
    gameTitle: params.gameTitle,
    eventLine: `Через ${params.timeLabel} матч. Ты не сделал прогноз:`,
    eventBold: true,
    teams: {
      homeTeam: params.homeTeam,
      awayTeam: params.awayTeam,
    },
    detailLine: "",
    schedule: { startsAt: params.startsAt },
    inviteCode: params.inviteCode,
    origin: params.origin,
  });
}

/** @deprecated Используйте buildMissingPredictionInAppBody / buildMissingPredictionCopyText */
export function buildMissingPredictionReminderText(params: {
  gameTitle: string;
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
