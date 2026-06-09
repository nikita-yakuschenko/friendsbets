import { escapeHtml } from "@/lib/email/escape";
import { NOTIFICATION_SIGNOFF } from "@/lib/notification-signoff";
import { PREDICTION_CTA_LABEL } from "@/lib/prediction-cta";
import {
  formatPredictionMatchLine,
  predictionsAbsoluteUrl,
} from "@/lib/prediction-reminder-content";
import { formatDateTimeMoscow, formatHoursUntilStart } from "@/lib/utils";

export type TelegramMatchTeams = {
  homeTeam: { name: string; countryCode: string | null };
  awayTeam: { name: string; countryCode: string | null };
};

export function telegramHtmlLink(href: string, label: string): string {
  const safeHref = href.replace(/"/g, "%22");
  return `<a href="${safeHref}">${escapeHtml(label)}</a>`;
}

export function formatPointsAccruedLabel(points: number): string {
  const mod10 = points % 10;
  const mod100 = points % 100;
  let word: string;
  if (mod10 === 1 && mod100 !== 11) word = "очко";
  else if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) {
    word = "очка";
  } else {
    word = "очков";
  }
  return `Начислено ${points} ${word}`;
}

export function formatRankLine(rank: number, totalPoints: number): string {
  const mod10 = totalPoints % 10;
  const mod100 = totalPoints % 100;
  let word: string;
  if (mod10 === 1 && mod100 !== 11) word = "очко";
  else if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) {
    word = "очка";
  } else {
    word = "очков";
  }
  return `Ты на ${rank} месте (${totalPoints} ${word})`;
}

/**
 * Единый шаблон Telegram-уведомления (15 строк с пропусками).
 */
export function buildTelegramNotificationHtml(params: {
  eventLine: string;
  teams: TelegramMatchTeams;
  detailLine: string;
  stats?: { pointsLine: string; rankLine: string };
  schedule?: {
    /** Строка 8, напр. «Следующий матч: …». Пусто — только время (стр. 9–10). */
    headerLine?: string;
    startsAt: Date;
  };
  inviteCode: string;
  origin?: string;
  eventBold?: boolean;
  signoff?: string;
  /** false — без ссылки на прогнозы (по умолчанию true). */
  showPredictionsLink?: boolean;
}): string {
  const lines: string[] = [];
  const matchLine = formatPredictionMatchLine(
    params.teams.homeTeam,
    params.teams.awayTeam,
  );

  lines.push(
    params.eventBold
      ? `<b>${escapeHtml(params.eventLine)}</b>`
      : escapeHtml(params.eventLine),
  );
  lines.push(escapeHtml(matchLine));
  if (params.detailLine.trim()) {
    lines.push(escapeHtml(params.detailLine));
  }

  if (params.stats) {
    lines.push("");
    lines.push(escapeHtml(params.stats.pointsLine));
    lines.push(escapeHtml(params.stats.rankLine));
  }

  if (params.schedule) {
    const startsAt = new Date(params.schedule.startsAt);
    lines.push("");
    if (params.schedule.headerLine?.trim()) {
      lines.push(escapeHtml(params.schedule.headerLine));
    }
    lines.push(escapeHtml(`начнётся ${formatDateTimeMoscow(startsAt)}`));
    lines.push(escapeHtml(`до начала ${formatHoursUntilStart(startsAt)}`));
  }

  const link = predictionsAbsoluteUrl(params.inviteCode, params.origin);
  if (params.showPredictionsLink !== false) {
    lines.push("");
    lines.push(telegramHtmlLink(link, PREDICTION_CTA_LABEL));
  }
  lines.push("");
  lines.push(params.signoff ?? NOTIFICATION_SIGNOFF);

  return lines.join("\n");
}

/** Несколько матчей под одним событием (ночной batch). */
export function buildTelegramBatchNotificationHtml(params: {
  eventLine: string;
  matches: Array<TelegramMatchTeams & { startsAt: Date }>;
  inviteCode: string;
  origin?: string;
}): string {
  const lines: string[] = [
    `<b>${escapeHtml(params.eventLine)}</b>`,
  ];

  for (const match of params.matches) {
    const matchLine = formatPredictionMatchLine(match.homeTeam, match.awayTeam);
    const startsAt = new Date(match.startsAt);
    lines.push(
      escapeHtml(matchLine),
      escapeHtml(`начнётся ${formatDateTimeMoscow(startsAt)}`),
      escapeHtml(`до начала ${formatHoursUntilStart(startsAt)}`),
      "",
    );
  }

  const link = predictionsAbsoluteUrl(params.inviteCode, params.origin);
  lines.push(telegramHtmlLink(link, PREDICTION_CTA_LABEL));
  lines.push("");
  lines.push(NOTIFICATION_SIGNOFF);

  return lines.join("\n");
}
