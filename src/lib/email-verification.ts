import crypto from "crypto";
import { UserRole } from "@/generated/prisma/client";
import { sendEmail } from "@/lib/email";
import { buildEmailVerificationContent } from "@/lib/email/templates";
import { prisma } from "@/lib/db";
import { absoluteAppUrl } from "@/lib/app-origin";
import { isSuperadmin } from "@/lib/roles";

const VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000;

export function userNeedsEmailVerification(user: {
  emailVerifiedAt: Date | null;
  role: UserRole;
}): boolean {
  if (isSuperadmin(user.role)) return false;
  return user.emailVerifiedAt === null;
}

export async function issueEmailVerificationToken(userId: string): Promise<string> {
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + VERIFICATION_TTL_MS);

  await prisma.user.update({
    where: { id: userId },
    data: {
      emailVerificationToken: token,
      emailVerificationExpiresAt: expiresAt,
    },
  });

  return token;
}

export async function sendEmailVerificationMessage(user: {
  id: string;
  email: string;
  name: string;
}): Promise<void> {
  const token = await issueEmailVerificationToken(user.id);
  const link = absoluteAppUrl(
    `/verify-email/confirm?token=${encodeURIComponent(token)}`,
  );
  const { text, html } = buildEmailVerificationContent({
    userName: user.name,
    link,
  });

  await sendEmail({
    to: user.email,
    subject: "FriendsBets: подтвердите email",
    text,
    html,
    kind: "transactional",
  });
}

export type VerifyEmailResult =
  | { ok: true; userId: string }
  | { ok: false; reason: "invalid" | "expired" };

export async function verifyEmailByToken(token: string): Promise<VerifyEmailResult> {
  const trimmed = token.trim();
  if (!trimmed) return { ok: false, reason: "invalid" };

  const user = await prisma.user.findFirst({
    where: { emailVerificationToken: trimmed },
    select: { id: true, emailVerificationExpiresAt: true },
  });

  if (!user) return { ok: false, reason: "invalid" };

  if (
    !user.emailVerificationExpiresAt ||
    user.emailVerificationExpiresAt.getTime() < Date.now()
  ) {
    return { ok: false, reason: "expired" };
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      emailVerifiedAt: new Date(),
      emailVerificationToken: null,
      emailVerificationExpiresAt: null,
    },
  });

  return { ok: true, userId: user.id };
}
