import { formatDateTime } from "@/lib/utils";
import { PREDICTION_CTA_LABEL } from "@/lib/prediction-cta";
import {
  buildMissingPredictionTelegramHtml,
  predictionsLinkFromEnv,
} from "@/lib/prediction-reminder-content";
import { escapeHtml } from "@/lib/email/escape";
import { NOTIFICATION_SIGNOFF } from "@/lib/notification-signoff";

/** Нет прогноза до старта матча (HTML, ссылка-кнопка). */
export function buildMissingPredictionTelegramText(params: {
  displayName: string;
  homeTeam: string;
  awayTeam: string;
  gameTitle: string;
  startsAt: Date;
  timeLabel: string;
  inviteCode: string;
}): string {
  return buildMissingPredictionTelegramHtml(params);
}

/** Старт матча — всем участникам (пока с явной ссылкой). */
export function buildMatchStartedTelegramText(params: {
  homeTeam: string;
  awayTeam: string;
  gameTitle: string;
  inviteCode: string;
}): string {
  const link = predictionsLinkFromEnv(params.inviteCode);
  return (
    `▶️ Матч начался: ${escapeHtml(params.homeTeam)} — ${escapeHtml(params.awayTeam)}\n` +
    `Турнир «${escapeHtml(params.gameTitle)}».\n` +
    `<a href="${link.replace(/"/g, "%22")}">${escapeHtml(PREDICTION_CTA_LABEL)}</a>\n\n` +
    NOTIFICATION_SIGNOFF
  );
}

/** Пост в канал о предстоящем матче. */
export function buildChannelMatchReminderText(params: {
  homeTeam: string;
  awayTeam: string;
  timeLabel: string;
  gameTitles: string[];
}): string {
  const games =
    params.gameTitles.length > 0
      ? params.gameTitles.join(", ")
      : "турниры FriendsBets";
  return `⏰ Через ${params.timeLabel}: ${params.homeTeam} — ${params.awayTeam}\n${games}`;
}

export function buildChannelMatchStartedText(params: {
  homeTeam: string;
  awayTeam: string;
  gameTitles: string[];
}): string {
  const games =
    params.gameTitles.length > 0
      ? params.gameTitles.join(", ")
      : "турниры FriendsBets";
  return `▶️ Матч начался: ${params.homeTeam} — ${params.awayTeam}\n${games}`;
}
