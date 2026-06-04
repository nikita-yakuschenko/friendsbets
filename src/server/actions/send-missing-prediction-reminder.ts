"use server";

import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth";
import { canManageGame, resolveGameIdFromRoute } from "@/lib/game-access";
import { formatMissingReminderSendFeedback } from "@/lib/missing-reminder-send-message";
import {
  sendMissingPredictionReminders,
  type MissingReminderChannel,
} from "@/lib/missing-prediction-reminder";
import { isTelegramConfigured } from "@/lib/telegram/config";
import type { ActionResult } from "@/server/actions/auth";

function parseChannel(raw: string): MissingReminderChannel | null {
  if (
    raw === "telegram" ||
    raw === "email" ||
    raw === "inApp" ||
    raw === "everywhere"
  ) {
    return raw;
  }
  return null;
}

export async function sendMissingPredictionReminderAction(
  routeParam: string,
  matchId: string,
  inviteCode: string,
  channelRaw: string,
): Promise<ActionResult> {
  const session = await requireAuth();
  const gameId = await resolveGameIdFromRoute(routeParam);
  if (!gameId) {
    return { error: "Турнир не найден." };
  }

  if (!(await canManageGame(session, gameId))) {
    return { error: "Нет доступа." };
  }

  const channel = parseChannel(channelRaw);
  if (!channel) {
    return { error: "Выберите канал доставки." };
  }

  if (channel === "telegram" && !isTelegramConfigured()) {
    return { error: "Telegram-бот не настроен." };
  }

  try {
    const result = await sendMissingPredictionReminders({
      gameId,
      matchId,
      inviteCode,
      channel,
    });

    if (result.recipients === 0) {
      return { error: "Все участники уже сделали прогноз." };
    }

    revalidatePath(`/game/${inviteCode}/control`);
    revalidatePath("/admin/missing");

    const feedback = formatMissingReminderSendFeedback(result, channel);
    if (feedback.error) {
      return { error: feedback.error, detail: feedback.detail };
    }
    return {
      success: true,
      message: feedback.message,
      detail: feedback.detail,
    };
  } catch (err) {
    if (err instanceof Error && err.message === "MATCH_NOT_FOUND") {
      return { error: "Матч не найден." };
    }
    console.error("[send-missing-prediction-reminder]", err);
    return { error: "Не удалось отправить напоминания." };
  }
}
