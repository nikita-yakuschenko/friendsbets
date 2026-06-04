"use server";

import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth";
import {
  sendPlatformNotificationBroadcast,
  type BroadcastAudience,
} from "@/lib/platform-broadcast";
import { isTelegramConfigured } from "@/lib/telegram/config";
import { isSuperadmin } from "@/lib/roles";
import type { ActionResult } from "@/server/actions/auth";

function parseAudience(raw: string): BroadcastAudience | null {
  if (raw === "all" || raw === "organizers" || raw === "personal") {
    return raw;
  }
  return null;
}

function formatResultMessage(result: {
  recipients: number;
  inApp: number;
  telegram: number;
  telegramFallbackInApp: number;
}): string {
  const parts = [`получателей: ${result.recipients}`];
  if (result.inApp > 0) {
    parts.push(`в приложении: ${result.inApp}`);
  }
  if (result.telegram > 0) {
    parts.push(`в Telegram: ${result.telegram}`);
  }
  if (result.telegramFallbackInApp > 0) {
    parts.push(
      `без Telegram (в приложении): ${result.telegramFallbackInApp}`,
    );
  }
  return `Отправлено (${parts.join(", ")}).`;
}

export async function broadcastPlatformNotificationAction(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const session = await requireAuth();
  if (!isSuperadmin(session.role)) {
    return { error: "Недостаточно прав." };
  }

  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  const audience = parseAudience(String(formData.get("audience") ?? ""));
  const channelInApp = formData.get("channelInApp") === "on";
  const channelTelegram = formData.get("channelTelegram") === "on";
  const personalUserIds = formData
    .getAll("userIds")
    .map((id) => String(id).trim())
    .filter(Boolean);

  if (!title) {
    return { error: "Укажите заголовок уведомления." };
  }
  if (!body) {
    return { error: "Укажите текст уведомления." };
  }
  if (title.length > 120) {
    return { error: "Заголовок — не длиннее 120 символов." };
  }
  if (body.length > 2000) {
    return { error: "Текст — не длиннее 2000 символов." };
  }
  if (!audience) {
    return { error: "Выберите аудиторию." };
  }
  if (!channelInApp && !channelTelegram) {
    return { error: "Выберите хотя бы один канал доставки." };
  }
  if (channelTelegram && !isTelegramConfigured()) {
    return { error: "Telegram-бот не настроен на сервере." };
  }
  if (audience === "personal" && personalUserIds.length === 0) {
    return { error: "Выберите хотя бы одного получателя." };
  }

  try {
    const result = await sendPlatformNotificationBroadcast({
      title,
      body,
      audience,
      personalUserIds,
      channels: { inApp: channelInApp, telegram: channelTelegram },
    });

    if (result.recipients === 0) {
      return { error: "Нет получателей для выбранной аудитории." };
    }

    revalidatePath("/admin");
    revalidatePath("/notifications");
    return {
      success: true,
      message: formatResultMessage(result),
    };
  } catch (err) {
    if (err instanceof Error && err.message === "TITLE_AND_BODY_REQUIRED") {
      return { error: "Заполните заголовок и текст." };
    }
    if (err instanceof Error && err.message === "CHANNEL_REQUIRED") {
      return { error: "Выберите хотя бы один канал доставки." };
    }
    console.error("[broadcast-notification]", err);
    return { error: "Не удалось отправить уведомление." };
  }
}
