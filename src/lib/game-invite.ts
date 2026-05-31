import { randomBytes } from "crypto";
import { prisma } from "@/lib/db";

export function generateInviteCode(): string {
  return randomBytes(4).toString("hex");
}

export function slugifyGameTitle(title: string): string {
  const slug = title
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);

  return slug || generateInviteCode();
}

export async function createUniqueInviteCode(): Promise<string> {
  for (let i = 0; i < 10; i++) {
    const inviteCode = generateInviteCode();
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

  return `${base}-${generateInviteCode()}`;
}

export function buildRegisterInviteUrl(inviteCode: string, origin?: string): string {
  const base =
    origin ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const url = new URL("/", base);
  url.searchParams.set("register", "1");
  url.searchParams.set("invite", inviteCode);
  return url.toString();
}

export function buildGameUrl(slug: string, origin?: string): string {
  const base =
    origin ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return `${base.replace(/\/$/, "")}/game/${slug}`;
}
