"use server";

import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth";
import { canManageGame, resolveGameIdFromRoute } from "@/lib/game-access";
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

function formatSendResult(result: {
  recipients: number;
  inApp: number;
  email: number;
  telegram: number;
  skipped: number;
}): string {
  const parts: string[] = [];
  if (result.inApp > 0) parts.push(`уведомления: ${result.inApp}`);
  if (result.email > 0) parts.push(`почта: ${result.email}`);
  if (result.telegram > 0) parts.push(`Telegram: ${result.telegram}`);
  if (result.skipped > 0) parts.push(`пропущено: ${result.skipped}`);
  return parts.length > 0
    ? `Отправлено (${parts.join(", ")}).`
    : "Никому не удалось доставить сообщение.";
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

    return { success: true, message: formatSendResult(result) };
  } catch (err) {
    if (err instanceof Error && err.message === "MATCH_NOT_FOUND") {
      return { error: "Матч не найден." };
    }
    console.error("[send-missing-prediction-reminder]", err);
    return { error: "Не удалось отправить напоминания." };
  }
}
