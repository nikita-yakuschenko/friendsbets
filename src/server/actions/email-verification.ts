"use server";

import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth";
import { sendEmailVerificationMessage } from "@/lib/email-verification";
import { prisma } from "@/lib/db";
import { checkRateLimit } from "@/lib/rate-limit";
import type { ActionResult } from "@/server/actions/auth";

export async function resendVerificationEmailAction(): Promise<ActionResult> {
  const session = await requireAuth({ allowUnverified: true });

  const rate = checkRateLimit(
    `verify-email:${session.id}`,
    5,
    60 * 60 * 1000,
  );
  if (!rate.allowed) {
    return { error: "Слишком много запросов. Попробуйте через час." };
  }

  const user = await prisma.user.findUnique({
    where: { id: session.id },
    select: {
      id: true,
      email: true,
      name: true,
      emailVerifiedAt: true,
      role: true,
    },
  });

  if (!user || user.emailVerifiedAt) {
    return { success: true, message: "Email уже подтверждён." };
  }

  try {
    await sendEmailVerificationMessage(user);
  } catch (err) {
    console.error("[verify-email:resend]", err);
    return {
      error:
        "Не удалось отправить письмо. Проверьте SMTP или попробуйте позже.",
    };
  }

  revalidatePath("/verify-email");
  return {
    success: true,
    message: `Письмо отправлено на ${user.email}. Проверьте входящие и спам.`,
  };
}
