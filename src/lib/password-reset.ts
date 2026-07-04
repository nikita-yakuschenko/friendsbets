import crypto from "crypto";
import bcrypt from "bcryptjs";
import { absoluteAppUrl } from "@/lib/app-origin";
import { sendEmail } from "@/lib/email";
import { buildPasswordResetContent } from "@/lib/email/templates";
import { prisma } from "@/lib/db";

const RESET_TTL_MS = 60 * 60 * 1000;

export async function issuePasswordResetToken(userId: string): Promise<string> {
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + RESET_TTL_MS);

  await prisma.user.update({
    where: { id: userId },
    data: {
      passwordResetToken: token,
      passwordResetExpiresAt: expiresAt,
    },
  });

  return token;
}

export async function sendPasswordResetMessage(user: {
  id: string;
  email: string;
  name: string;
}): Promise<void> {
  const token = await issuePasswordResetToken(user.id);
  const link = absoluteAppUrl(
    `/reset-password?token=${encodeURIComponent(token)}`,
  );
  const { text, html } = buildPasswordResetContent({
    userName: user.name,
    link,
  });

  await sendEmail({
    to: user.email,
    subject: "FriendsBets: сброс пароля",
    text,
    html,
    kind: "transactional",
  });
}

export type ResetPasswordByTokenResult =
  | { ok: true }
  | { ok: false; reason: "invalid" | "expired" };

export async function resetPasswordByToken(
  token: string,
  newPassword: string,
): Promise<ResetPasswordByTokenResult> {
  const trimmed = token.trim();
  if (!trimmed) return { ok: false, reason: "invalid" };

  const user = await prisma.user.findFirst({
    where: { passwordResetToken: trimmed },
    select: { id: true, passwordResetExpiresAt: true },
  });

  if (!user) return { ok: false, reason: "invalid" };

  if (
    !user.passwordResetExpiresAt ||
    user.passwordResetExpiresAt.getTime() < Date.now()
  ) {
    return { ok: false, reason: "expired" };
  }

  const passwordHash = await bcrypt.hash(newPassword, 12);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash,
      passwordResetToken: null,
      passwordResetExpiresAt: null,
    },
  });

  return { ok: true };
}
