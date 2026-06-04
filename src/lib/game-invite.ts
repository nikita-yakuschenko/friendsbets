import { getAppOriginFromEnv } from "@/lib/app-origin";
import { prisma } from "@/lib/db";
import {
  generateRandomInviteCode,
  normalizeInviteCodeInput,
} from "@/lib/invite-code";

export function slugifyGameTitle(title: string): string {
  const slug = title
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);

  return slug || generateRandomInviteCode().toLowerCase();
}

export async function findGameByInviteCode(raw: string) {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const upper = normalizeInviteCodeInput(trimmed);

  return prisma.game.findFirst({
    where: {
      OR: [{ inviteCode: upper }, { inviteCode: trimmed }],
    },
  });
}

export async function createUniqueInviteCode(
  preferred?: string,
): Promise<string> {
  const normalized = preferred ? normalizeInviteCodeInput(preferred) : "";

  if (normalized) {
    const taken = await findGameByInviteCode(normalized);
    if (taken) {
      throw new Error("INVITE_CODE_TAKEN");
    }
    return normalized;
  }

  for (let i = 0; i < 20; i++) {
    const inviteCode = generateRandomInviteCode();
    const existing = await prisma.game.findUnique({ where: { inviteCode } });
    if (!existing) return inviteCode;
  }

  throw new Error("INVITE_CODE_COLLISION");
}

export async function createUniqueGameSlug(baseTitle: string): Promise<string> {
  const base = slugifyGameTitle(baseTitle);

  for (let i = 0; i < 20; i++) {
    const slug = i === 0 ? base : `${base}-${i + 1}`;
    const existing = await prisma.game.findUnique({ where: { slug } });
    if (!existing) return slug;
  }

  return `${base}-${generateRandomInviteCode().toLowerCase()}`;
}

export function buildRegisterInviteUrl(inviteCode: string, origin?: string): string {
  const base = origin ?? getAppOriginFromEnv();
  const url = new URL("/", base);
  url.searchParams.set("register", "1");
  url.searchParams.set("invite", inviteCode);
  return url.toString();
}

export function buildGameUrl(inviteCode: string, origin?: string): string {
  const base = (origin ?? getAppOriginFromEnv()).replace(/\/$/, "");
  return `${base}/game/${inviteCode}`;
}
