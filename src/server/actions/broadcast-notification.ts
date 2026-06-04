"use server";

import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth";
import { broadcastPlatformNotification } from "@/lib/notifications";
import { isSuperadmin } from "@/lib/roles";
import type { ActionResult } from "@/server/actions/auth";

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

  try {
    const count = await broadcastPlatformNotification(title, body);
    revalidatePath("/admin");
    revalidatePath("/notifications");
    return {
      success: true,
      message: `Уведомление отправлено ${count} пользователям.`,
    };
  } catch (err) {
    if (err instanceof Error && err.message === "TITLE_AND_BODY_REQUIRED") {
      return { error: "Заполните заголовок и текст." };
    }
    console.error("[broadcast-notification]", err);
    return { error: "Не удалось отправить уведомление." };
  }
}
