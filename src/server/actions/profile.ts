"use server";

import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth";
import { removeAvatarStored, storeAvatar } from "@/lib/avatar-storage";
import { prisma } from "@/lib/db";
import type { ActionResult } from "@/server/actions/auth";

export async function getProfileForUser(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      avatarUrl: true,
      updatedAt: true,
      emailVerifiedAt: true,
      notifyByEmail: true,
      notifyByTelegram: true,
      notifyInApp: true,
    },
  });
}

function parsePreferenceFlag(value: FormDataEntryValue | null): boolean {
  return value === "1" || value === "on" || value === "true";
}

export async function updateNotificationPreferencesAction(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const session = await requireAuth();
  const current = await prisma.user.findUnique({
    where: { id: session.id },
    select: {
      emailVerifiedAt: true,
      telegramChatId: true,
      notifyByEmail: true,
      notifyByTelegram: true,
      notifyInApp: true,
    },
  });
  if (!current) {
    return { error: "Пользователь не найден." };
  }

  const notifyByEmail = parsePreferenceFlag(formData.get("notifyByEmail"));
  const notifyByTelegram = parsePreferenceFlag(formData.get("notifyByTelegram"));
  const notifyInApp = parsePreferenceFlag(formData.get("notifyInApp"));

  if (
    notifyByEmail === current.notifyByEmail &&
    notifyByTelegram === current.notifyByTelegram &&
    notifyInApp === current.notifyInApp
  ) {
    return { error: "Нет изменений для сохранения." };
  }

  if (notifyByEmail && !current.emailVerifiedAt) {
    return { error: "Сначала подтвердите email." };
  }

  if (notifyByTelegram && current.telegramChatId == null) {
    return { error: "Сначала привяжите Telegram." };
  }

  await prisma.user.update({
    where: { id: session.id },
    data: {
      notifyByEmail: current.emailVerifiedAt ? notifyByEmail : false,
      notifyByTelegram:
        current.telegramChatId != null ? notifyByTelegram : false,
      notifyInApp,
    },
  });

  revalidatePath("/profile");
  return { success: true };
}

export async function updateProfileAction(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const session = await requireAuth();
  const current = await prisma.user.findUnique({
    where: { id: session.id },
    select: { name: true, avatarUrl: true },
  });
  if (!current) {
    return { error: "Пользователь не найден." };
  }

  const name = String(formData.get("name") ?? "").trim();
  const removeAvatar = formData.get("removeAvatar") === "1";
  const file = formData.get("avatar");
  const hasFile = file instanceof File && file.size > 0;

  const nameChanged = name !== current.name;

  if (!nameChanged && !hasFile && !removeAvatar) {
    return { error: "Нет изменений для сохранения." };
  }

  if (!name) {
    return { error: "Введите отображаемое имя." };
  }

  if (name.length > 80) {
    return { error: "Имя не длиннее 80 символов." };
  }

  try {
    if (hasFile) {
      const avatarUrl = await storeAvatar(session.id, file);
      await prisma.user.update({
        where: { id: session.id },
        data: {
          name,
          avatarUrl,
        },
      });
    } else if (removeAvatar) {
      await removeAvatarStored(session.id);
      await prisma.user.update({
        where: { id: session.id },
        data: { name, avatarUrl: null },
      });
    } else {
      await prisma.user.update({
        where: { id: session.id },
        data: { name },
      });
    }

    if (nameChanged) {
      await prisma.gameParticipant.updateMany({
        where: { userId: session.id },
        data: { displayName: name },
      });
    }
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Не удалось сохранить профиль.",
    };
  }

  revalidatePath("/profile");
  revalidatePath("/", "layout");

  return { success: true };
}
