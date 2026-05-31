"use server";

import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { GameParticipantRole, UserRole } from "@/generated/prisma/client";
import { clearSession, requireAuth, setSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { checkRateLimit } from "@/lib/rate-limit";

export type ActionResult = {
  error?: string;
  success?: boolean;
};

export async function loginAction(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");

  const rate = checkRateLimit(`login:${email}`, 10, 15 * 60 * 1000);
  if (!rate.allowed) {
    return { error: "Слишком много попыток входа. Попробуйте позже." };
  }

  if (!email || !password) {
    return { error: "Введите email и пароль." };
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return { error: "Неверный email или пароль." };
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    return { error: "Неверный email или пароль." };
  }

  await setSession(user.id);
  redirect("/");
}

export async function registerAction(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const honeypot = String(formData.get("website") ?? "").trim();
  if (honeypot) {
    return { error: "Регистрация отклонена." };
  }

  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");
  const inviteCode = String(formData.get("inviteCode") ?? "").trim();

  const rate = checkRateLimit(`register:${email}`, 5, 60 * 60 * 1000);
  if (!rate.allowed) {
    return { error: "Слишком много попыток регистрации. Попробуйте позже." };
  }

  if (!name || !email || !password || !inviteCode) {
    return { error: "Заполните все поля." };
  }

  if (password.length < 6) {
    return { error: "Пароль должен быть не короче 6 символов." };
  }

  const game = await prisma.game.findUnique({ where: { inviteCode } });
  if (!game) {
    return { error: "Неверный invite-код игры." };
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { error: "Пользователь с таким email уже существует." };
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash,
      role: UserRole.PARTICIPANT,
      gameParticipants: {
        create: {
          gameId: game.id,
          displayName: name,
          role: GameParticipantRole.PARTICIPANT,
        },
      },
    },
  });

  await setSession(user.id);
  redirect(`/game/${game.slug}`);
}

export async function logoutAction() {
  await clearSession();
  redirect("/");
}

export async function getCurrentUserAction() {
  return requireAuth().catch(() => null);
}
