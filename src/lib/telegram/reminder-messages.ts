import { gamePath } from "@/lib/game-path";
import { getAppOriginFromEnv } from "@/lib/app-origin";
import { formatDateTime } from "@/lib/utils";

function predictionsLink(inviteCode: string): string {
  const origin = getAppOriginFromEnv().replace(/\/$/, "");
  return `${origin}${gamePath(inviteCode, "predictions")}`;
}

/** Нет прогноза до старта матча. */
export function buildMissingPredictionTelegramText(params: {
  displayName: string;
  homeTeam: string;
  awayTeam: string;
  gameTitle: string;
  startsAt: Date;
  timeLabel: string;
  inviteCode: string;
}): string {
  return (
    `⏰ ${params.displayName}, через ${params.timeLabel} матч ${params.homeTeam} — ${params.awayTeam} ` +
    `(турнир «${params.gameTitle}», ${formatDateTime(params.startsAt)}).\n` +
    `Вы ещё не сделали прогноз.\n` +
    predictionsLink(params.inviteCode)
  );
}

/** Старт матча — всем участникам. */
export function buildMatchStartedTelegramText(params: {
  homeTeam: string;
  awayTeam: string;
  gameTitle: string;
  inviteCode: string;
}): string {
  return (
    `▶️ Матч начался: ${params.homeTeam} — ${params.awayTeam}\n` +
    `Турнир «${params.gameTitle}».\n` +
    predictionsLink(params.inviteCode)
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
