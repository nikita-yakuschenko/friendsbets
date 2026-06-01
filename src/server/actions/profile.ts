"use server";

import { revalidatePath } from "next/cache";
import { unlink } from "fs/promises";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { requireAuth } from "@/lib/auth";
import {
  AVATAR_ALLOWED_TYPES,
  AVATAR_MAX_BYTES,
  avatarDiskPath,
  avatarExtensionFromMime,
  avatarPublicPath,
} from "@/lib/avatar";
import { prisma } from "@/lib/db";
import type { ActionResult } from "@/server/actions/auth";

const AVATAR_DIR = path.join(process.cwd(), "public", "avatars");
const AVATAR_EXTENSIONS = ["jpg", "png", "webp"] as const;

export async function getProfileForUser(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      avatarUrl: true,
      updatedAt: true,
    },
  });
}

async function saveAvatarFile(userId: string, file: File): Promise<string> {
  if (!AVATAR_ALLOWED_TYPES.has(file.type)) {
    throw new Error("Допустимы JPEG, PNG или WebP.");
  }

  if (file.size > AVATAR_MAX_BYTES) {
    throw new Error("Файл не больше 5 МБ.");
  }

  const ext = avatarExtensionFromMime(file.type);
  if (!ext) {
    throw new Error("Неподдерживаемый формат.");
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  await mkdir(AVATAR_DIR, { recursive: true });
  await removeAvatarFiles(userId);

  const diskPath = avatarDiskPath(userId, ext);
  await writeFile(diskPath, buffer);

  return avatarPublicPath(userId, ext);
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
      const avatarUrl = await saveAvatarFile(session.id, file);
      await prisma.user.update({
        where: { id: session.id },
        data: {
          name,
          avatarUrl,
        },
      });
    } else if (removeAvatar) {
      await removeAvatarFiles(session.id);
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

async function removeAvatarFiles(userId: string) {
  await Promise.all(
    AVATAR_EXTENSIONS.map(async (ext) => {
      try {
        await unlink(avatarDiskPath(userId, ext));
      } catch {
        // file may not exist
      }
    }),
  );
}

