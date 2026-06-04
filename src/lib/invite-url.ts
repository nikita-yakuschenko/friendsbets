import { getAppOriginFromEnv } from "@/lib/app-origin";
import { normalizeInviteCodeInput } from "@/lib/invite-code";

/** Путь канонической ссылки приглашения (без origin). Без Prisma — можно импортировать в client. */
export function buildInvitePath(inviteCode: string): string {
  const code = normalizeInviteCodeInput(inviteCode);
  return `/invite/${encodeURIComponent(code)}`;
}

export function buildRegisterInviteUrl(inviteCode: string, origin?: string): string {
  const base = (origin ?? getAppOriginFromEnv()).replace(/\/$/, "");
  return `${base}${buildInvitePath(inviteCode)}`;
}

export function buildGameUrl(inviteCode: string, origin?: string): string {
  const base = (origin ?? getAppOriginFromEnv()).replace(/\/$/, "");
  return `${base}/game/${inviteCode}`;
}
