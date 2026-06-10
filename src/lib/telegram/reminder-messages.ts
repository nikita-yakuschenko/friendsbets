import {
  buildMissingPredictionTelegramHtml,
} from "@/lib/prediction-reminder-content";
import { buildTelegramNotificationHtml } from "@/lib/telegram/notification-layout";

/** Нет прогноза до старта матча (HTML, ссылка-кнопка). */
export function buildMissingPredictionTelegramText(params: {
  gameTitle: string;
  homeTeam: { name: string; countryCode: string | null };
  awayTeam: { name: string; countryCode: string | null };
  startsAt: Date;
  timeLabel: string;
  inviteCode: string;
}): string {
  return buildMissingPredictionTelegramHtml(params);
}

/** Старт матча — всем участникам с прогнозом. */
export function buildMatchStartedTelegramText(params: {
  gameTitle: string;
  homeTeam: { name: string; countryCode: string | null };
  awayTeam: { name: string; countryCode: string | null };
  inviteCode: string;
  predictedHome?: number | null;
  predictedAway?: number | null;
}): string {
  const detailLine =
    params.predictedHome != null && params.predictedAway != null
      ? `Прогноз: ${params.predictedHome}:${params.predictedAway}`
      : "Прогноз не сделан";

  return buildTelegramNotificationHtml({
    gameTitle: params.gameTitle,
    eventLine: "Матч начался:",
    eventBold: true,
    teams: {
      homeTeam: params.homeTeam,
      awayTeam: params.awayTeam,
    },
    detailLine,
    inviteCode: params.inviteCode,
  });
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
