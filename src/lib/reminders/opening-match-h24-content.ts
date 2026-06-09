import { escapeHtml } from "@/lib/email/escape";
import {
  EMAIL_BRAND,
  renderEmailLayout,
  renderMatchCard,
} from "@/lib/email/layout";
import type { EmailContent } from "@/lib/email/templates";
import {
  formatPredictionMatchLine,
  predictionsAbsoluteUrl,
} from "@/lib/prediction-reminder-content";
import { PREDICTION_CTA_LABEL } from "@/lib/prediction-cta";
import { buildTelegramNotificationHtml } from "@/lib/telegram/notification-layout";

export const OPENING_H24_TITLE = "Турнир через 24 часа";

export const OPENING_H24_WITH_PREDICTION_TEXT =
  "Ты уже сделал прогноз на матч открытия, не забывай что турнир проходит в другой части света, поэтому делать прогнозы лучше заранее.";

export const OPENING_H24_WITHOUT_PREDICTION_TEXT =
  "Ты ещё не сделал прогноз на матч открытия, не забудь про это иначе потеряешь очки прямо на старте.";

export const OPENING_H24_SIGNOFF =
  "Счастливых вам Голодных игр, и пусть удача всегда будет с вами!";

type OpeningH24Match = {
  homeTeam: { name: string; countryCode: string | null };
  awayTeam: { name: string; countryCode: string | null };
  startsAt: Date;
};

type OpeningH24ContentInput = OpeningH24Match & {
  gameTitle: string;
  inviteCode: string;
  hasPrediction: boolean;
  origin?: string;
};

function openingH24LeadLine(): string {
  return "До начала турнира осталось 24 часа.";
}

function openingH24DetailLine(hasPrediction: boolean): string {
  return hasPrediction
    ? OPENING_H24_WITH_PREDICTION_TEXT
    : OPENING_H24_WITHOUT_PREDICTION_TEXT;
}

function buildOpeningH24PlainBody(params: OpeningH24ContentInput): string {
  const matchLine = formatPredictionMatchLine(
    params.homeTeam,
    params.awayTeam,
  );
  return [
    openingH24LeadLine(),
    openingH24DetailLine(params.hasPrediction),
    "",
    `Матч открытия: ${matchLine}`,
    "",
    OPENING_H24_SIGNOFF,
  ].join("\n");
}

export function buildOpeningH24InAppBody(
  params: OpeningH24ContentInput,
): string {
  return buildOpeningH24PlainBody(params);
}

export function buildOpeningH24TelegramHtml(
  params: OpeningH24ContentInput,
): string {
  return buildTelegramNotificationHtml({
    eventLine: openingH24LeadLine(),
    eventBold: true,
    teams: {
      homeTeam: params.homeTeam,
      awayTeam: params.awayTeam,
    },
    detailLine: openingH24DetailLine(params.hasPrediction),
    schedule: {
      headerLine: "Матч открытия:",
      startsAt: params.startsAt,
    },
    inviteCode: params.inviteCode,
    origin: params.origin,
    signoff: OPENING_H24_SIGNOFF,
    showPredictionsLink: !params.hasPrediction,
  });
}

export function buildOpeningH24EmailContent(
  params: OpeningH24ContentInput & { userName: string },
): EmailContent {
  const predictionsLink = predictionsAbsoluteUrl(
    params.inviteCode,
    params.origin,
  );
  const matchLine = formatPredictionMatchLine(
    params.homeTeam,
    params.awayTeam,
  );
  const body = buildOpeningH24PlainBody(params);

  const text = [
    `Привет, ${params.userName}!`,
    "",
    body,
    "",
    `${PREDICTION_CTA_LABEL}: ${predictionsLink}`,
  ].join("\n");

  const html = renderEmailLayout({
    preheader: `${OPENING_H24_TITLE}: ${matchLine}`,
    badge: OPENING_H24_TITLE,
    title: openingH24LeadLine(),
    introHtml: `
      <p style="margin:0 0 14px;">Привет, <strong style="color:${EMAIL_BRAND.heading};font-weight:600;">${escapeHtml(params.userName)}</strong>!</p>
      <p style="margin:0 0 14px;">Турнир «${escapeHtml(params.gameTitle)}»</p>
      <p style="margin:0;">${escapeHtml(openingH24DetailLine(params.hasPrediction))}</p>`,
    blocksHtml: renderMatchCard({
      homeTeam: params.homeTeam.name,
      awayTeam: params.awayTeam.name,
      gameTitle: params.gameTitle,
      startsAtLabel: `Матч открытия · ${matchLine}`,
      timeLabel: "24 часа до старта",
    }),
    cta: params.hasPrediction
      ? undefined
      : { label: PREDICTION_CTA_LABEL, href: predictionsLink },
    footnote: OPENING_H24_SIGNOFF,
  });

  return { text, html };
}

export function openingH24EmailSubject(
  homeTeam: string,
  awayTeam: string,
): string {
  return `FriendsBets: ${OPENING_H24_TITLE} — ${homeTeam} — ${awayTeam}`;
}
