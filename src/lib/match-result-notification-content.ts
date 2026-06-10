import { absoluteAppUrl } from "@/lib/app-origin";
import { escapeHtml } from "@/lib/email/escape";
import {
  EMAIL_BRAND,
  renderEmailLayout,
  renderMatchCard,
} from "@/lib/email/layout";
import type { EmailContent } from "@/lib/email/templates";
import { gamePath } from "@/lib/game-path";
import { NOTIFICATION_SIGNOFF } from "@/lib/notification-signoff";
import { PREDICTION_CTA_LABEL } from "@/lib/prediction-cta";
import { formatPredictionMatchLine } from "@/lib/prediction-reminder-content";
import {
  buildTelegramNotificationHtml,
  formatPointsAccruedLabel,
  formatRankLine,
} from "@/lib/telegram/notification-layout";
import { withTournamentNotificationLead } from "@/lib/tournament-notification-lead";
import { formatDateTimeMoscow, formatRelativeTime } from "@/lib/utils";

export type MatchResultNotificationInput = {
  homeTeam: { name: string; countryCode: string | null };
  awayTeam: { name: string; countryCode: string | null };
  homeScore: number;
  awayScore: number;
  gameTitle: string;
  inviteCode: string;
  predictedHome: number | null;
  predictedAway: number | null;
  matchPoints: number;
  matchPointsReason: string;
  rank: number;
  participantsCount: number;
  totalPoints: number;
  nextMatch: {
    homeTeam: { name: string; countryCode: string | null };
    awayTeam: { name: string; countryCode: string | null };
    startsAt: Date;
    hasPrediction: boolean;
  } | null;
  origin?: string;
};

export function formatPointsLabel(points: number): string {
  const mod10 = points % 10;
  const mod100 = points % 100;
  if (mod10 === 1 && mod100 !== 11) return `${points} очко`;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) {
    return `${points} очка`;
  }
  return `${points} очков`;
}

function predictionsUrl(inviteCode: string, origin?: string): string {
  return absoluteAppUrl(gamePath(inviteCode, "predictions"), origin);
}

function leaderboardUrl(inviteCode: string, origin?: string): string {
  return absoluteAppUrl(gamePath(inviteCode, "leaderboard"), origin);
}

function buildResultLines(params: MatchResultNotificationInput): string[] {
  const matchLine = formatPredictionMatchLine(
    params.homeTeam,
    params.awayTeam,
  );
  const lines = [
    `Матч завершён: ${matchLine}`,
    `Счёт: ${params.homeScore}:${params.awayScore}`,
  ];

  if (params.predictedHome != null && params.predictedAway != null) {
    lines.push(`Ваш прогноз: ${params.predictedHome}:${params.predictedAway}`);
    lines.push(
      `Заработано: ${formatPointsLabel(params.matchPoints)} (${params.matchPointsReason})`,
    );
  } else {
    lines.push("Вы не сделали прогноз на этот матч");
  }

  lines.push(
    "",
    `Вы на ${params.rank} месте из ${params.participantsCount} (всего ${formatPointsLabel(params.totalPoints)})`,
  );

  if (params.nextMatch) {
    const nextLine = formatPredictionMatchLine(
      params.nextMatch.homeTeam,
      params.nextMatch.awayTeam,
    );
    lines.push(
      "",
      "Следующий матч:",
      nextLine,
      `начнётся ${formatDateTimeMoscow(params.nextMatch.startsAt)}`,
      `до начала ${formatRelativeTime(params.nextMatch.startsAt)}`,
    );
    if (!params.nextMatch.hasPrediction) {
      lines.push("Не забудьте сделать прогноз!");
    }
  }

  lines.push("", NOTIFICATION_SIGNOFF);
  return withTournamentNotificationLead(params.gameTitle, lines);
}

export function buildMatchResultInAppBody(
  params: MatchResultNotificationInput,
): string {
  return buildResultLines(params).join("\n");
}

export function buildMatchResultTelegramHtml(
  params: MatchResultNotificationInput,
): string {
  const nextMatch = params.nextMatch
    ? {
        headerLine: `Следующий матч: ${formatPredictionMatchLine(
          params.nextMatch.homeTeam,
          params.nextMatch.awayTeam,
        )}`,
        startsAt: params.nextMatch.startsAt,
      }
    : undefined;

  return buildTelegramNotificationHtml({
    gameTitle: params.gameTitle,
    eventLine: "Матч завершён:",
    eventBold: true,
    teams: {
      homeTeam: params.homeTeam,
      awayTeam: params.awayTeam,
    },
    detailLine: `Счёт: ${params.homeScore}:${params.awayScore}`,
    stats: {
      pointsLine: formatPointsAccruedLabel(params.matchPoints),
      rankLine: formatRankLine(params.rank, params.totalPoints),
    },
    schedule: nextMatch,
    inviteCode: params.inviteCode,
    origin: params.origin,
  });
}

export function buildMatchResultEmailContent(
  params: MatchResultNotificationInput & { userName: string },
): EmailContent {
  const body = buildMatchResultInAppBody(params);
  const predictionsLink = predictionsUrl(params.inviteCode, params.origin);
  const tableLink = leaderboardUrl(params.inviteCode, params.origin);
  const matchLine = `${params.homeTeam.name} — ${params.awayTeam.name}`;

  const text = [
    `Привет, ${params.userName}!`,
    "",
    body,
    "",
    `${PREDICTION_CTA_LABEL}: ${predictionsLink}`,
    `Таблица: ${tableLink}`,
    "",
    NOTIFICATION_SIGNOFF,
  ].join("\n");

  const html = renderEmailLayout({
    preheader: `Результат матча ${matchLine}: ${params.homeScore}:${params.awayScore}`,
    badge: "Результат матча",
    title: `${matchLine} — ${params.homeScore}:${params.awayScore}`,
    introHtml: `
      <p style="margin:0 0 14px;">Привет, <strong style="color:${EMAIL_BRAND.heading};font-weight:600;">${escapeHtml(params.userName)}</strong>!</p>
      <p style="margin:0;">Турнир «${escapeHtml(params.gameTitle)}»</p>`,
    blocksHtml: renderMatchCard({
      homeTeam: params.homeTeam.name,
      awayTeam: params.awayTeam.name,
      gameTitle: params.gameTitle,
      startsAtLabel: `Итог: ${params.homeScore}:${params.awayScore}`,
      timeLabel:
        params.predictedHome != null && params.predictedAway != null
          ? `Прогноз ${params.predictedHome}:${params.predictedAway} · ${formatPointsLabel(params.matchPoints)}`
          : "Прогноз не сделан",
    }),
    cta: { label: PREDICTION_CTA_LABEL, href: predictionsLink },
    footnote: `Ваше место в таблице: ${params.rank} из ${params.participantsCount}.`,
  });

  return { text, html };
}

export function buildMatchResultTitle(params: {
  homeTeam: { name: string };
  awayTeam: { name: string };
  homeScore: number;
  awayScore: number;
}): string {
  return `Результат: ${params.homeTeam.name} — ${params.awayTeam.name} ${params.homeScore}:${params.awayScore}`;
}
