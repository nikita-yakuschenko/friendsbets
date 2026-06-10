"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import {
  resetPasswordByToken,
  sendPasswordResetMessage,
} from "@/lib/password-reset";
import { normalizeUserEmail } from "@/lib/normalize-user-email";
import { checkRateLimit } from "@/lib/rate-limit";
import type { ActionResult } from "@/server/actions/auth";

const GENERIC_RESET_MESSAGE =
  "Если аккаунт с таким email есть, мы отправили ссылку для сброса пароля.";

export async function requestPasswordResetAction(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const email = normalizeUserEmail(String(formData.get("email") ?? ""));

  const rate = checkRateLimit(`password-reset:${email}`, 5, 60 * 60 * 1000);
  if (!rate.allowed) {
    return { error: "Слишком много запросов. Попробуйте позже." };
  }

  if (!email) {
    return { error: "Введите email." };
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, name: true },
  });

  if (user) {
    try {
      await sendPasswordResetMessage(user);
    } catch (error) {
      console.error("[password-reset] email failed", error);
      return { error: "Не удалось отправить письмо. Попробуйте позже." };
    }
  }

  return { success: true, message: GENERIC_RESET_MESSAGE };
}

export async function resetPasswordAction(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const token = String(formData.get("token") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const passwordConfirm = String(formData.get("passwordConfirm") ?? "");

  if (!token) {
    return { error: "Ссылка недействительна. Запросите сброс пароля снова." };
  }

  if (!password || password.length < 6) {
    return { error: "Пароль не короче 6 символов." };
  }

  if (password !== passwordConfirm) {
    return { error: "Пароли не совпадают." };
  }

  const result = await resetPasswordByToken(token, password);

  if (!result.ok) {
    if (result.reason === "expired") {
      return {
        error: "Ссылка истекла. Запросите сброс пароля на странице «Забыли пароль?».",
      };
    }
    return { error: "Ссылка недействительна. Запросите сброс пароля снова." };
  }

  redirect("/?passwordReset=1");
}
