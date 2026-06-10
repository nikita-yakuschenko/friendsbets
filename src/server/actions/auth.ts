"use server";

import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import {
  GameParticipantRole,
  Prisma,
  UserRole,
} from "@/generated/prisma/client";
import { clearSession, requireAuth, setSession } from "@/lib/auth";
import { findGameByInviteCode } from "@/lib/game-invite";
import {
  normalizeInviteCodeInput,
  validateInviteCodeFormat,
} from "@/lib/invite-code";
import { prisma } from "@/lib/db";
import {
  sendEmailVerificationMessage,
  userNeedsEmailVerification,
} from "@/lib/email-verification";
import { checkRateLimit } from "@/lib/rate-limit";
import { normalizeUserEmail } from "@/lib/normalize-user-email";
import { notifyOpeningMatchOnTournamentJoin } from "@/lib/tournament-opening-reminder";

export type ActionResult = {
  error?: string;
  success?: boolean;
  message?: string;
  /** Дополнительная строка для toast (sonner description). */
  detail?: string;
};

export async function loginAction(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const email = normalizeUserEmail(String(formData.get("email") ?? ""));
  const password = String(formData.get("password") ?? "");

  const rate = checkRateLimit(`login:${email}`, 10, 15 * 60 * 1000);
  if (!rate.allowed) {
    return { error: "Слишком много попыток входа. Попробуйте позже." };
  }

  if (!email || !password) {
    return { error: "Введите email и пароль." };
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      name: true,
      passwordHash: true,
      role: true,
      emailVerifiedAt: true,
      emailVerificationExpiresAt: true,
    },
  });
  if (!user) {
    return { error: "Неверный email или пароль." };
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    return { error: "Неверный email или пароль." };
  }

  await setSession(user.id);

  if (userNeedsEmailVerification(user)) {
    const tokenExpired =
      !user.emailVerificationExpiresAt ||
      user.emailVerificationExpiresAt.getTime() < Date.now();
    if (tokenExpired) {
      try {
        await sendEmailVerificationMessage(user);
      } catch (err) {
        console.error("[auth:login] verification email failed", err);
      }
    }
    redirect("/verify-email");
  }

  const inviteCodeRaw = String(formData.get("inviteCode") ?? "").trim();
  if (inviteCodeRaw) {
    const formatError = validateInviteCodeFormat(inviteCodeRaw);
    if (!formatError) {
      const normalized = normalizeInviteCodeInput(inviteCodeRaw);
      const game = await findGameByInviteCode(normalized);
      if (game) {
        redirect(`/join?invite=${encodeURIComponent(normalized)}`);
      }
    }
  }

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
  const email = normalizeUserEmail(String(formData.get("email") ?? ""));
  const password = String(formData.get("password") ?? "");
  const inviteCodeRaw = String(formData.get("inviteCode") ?? "").trim();

  const rate = checkRateLimit(`register:${email}`, 5, 60 * 60 * 1000);
  if (!rate.allowed) {
    return { error: "Слишком много попыток регистрации. Попробуйте позже." };
  }

  if (!name || !email || !password) {
    return { error: "Заполните имя, email и пароль." };
  }

  if (password.length < 6) {
    return { error: "Пароль должен быть не короче 6 символов." };
  }

  let game: Awaited<ReturnType<typeof findGameByInviteCode>> = null;

  if (inviteCodeRaw) {
    const formatError = validateInviteCodeFormat(inviteCodeRaw);
    if (formatError) return { error: formatError };

    game = await findGameByInviteCode(normalizeInviteCodeInput(inviteCodeRaw));
    if (!game) {
      return { error: "Неверный invite-код турнира." };
    }
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { error: "Пользователь с таким email уже существует." };
  }

  const passwordHash = await bcrypt.hash(password, 12);

  let user: {
    id: string;
    email: string;
    name: string;
    role: UserRole;
    emailVerifiedAt: Date | null;
  };

  try {
    user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        role: UserRole.PARTICIPANT,
        ...(game
          ? {
              gameParticipants: {
                create: {
                  gameId: game.id,
                  displayName: name,
                  role: GameParticipantRole.PARTICIPANT,
                },
              },
            }
          : {}),
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        emailVerifiedAt: true,
      },
    });
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      return { error: "Пользователь с таким email уже существует." };
    }
    throw err;
  }

  try {
    await sendEmailVerificationMessage(user);
  } catch (err) {
    console.error("[auth:register] verification email failed", err);
  }

  if (game) {
    await notifyOpeningMatchOnTournamentJoin(user.id, game.id);
  }

  await setSession(user.id);
  redirect("/verify-email");
}

export async function logoutAction() {
  await clearSession();
  redirect("/");
}

export async function getCurrentUserAction() {
  return requireAuth().catch(() => null);
}
