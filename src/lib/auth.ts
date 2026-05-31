import crypto from "crypto";
import { cookies } from "next/headers";
import { UserRole } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { isAdmin } from "@/lib/roles";

const SESSION_COOKIE = "fb_session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 30;

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
};

function getSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("SESSION_SECRET is not set");
  }
  return secret;
}

export function signSession(userId: string): string {
  const payload = JSON.stringify({
    userId,
    exp: Date.now() + SESSION_MAX_AGE * 1000,
  });
  const signature = crypto
    .createHmac("sha256", getSecret())
    .update(payload)
    .digest("hex");
  return Buffer.from(`${payload}.${signature}`).toString("base64url");
}

export function verifySessionToken(token: string): { userId: string } | null {
  try {
    const decoded = Buffer.from(token, "base64url").toString("utf8");
    const lastDot = decoded.lastIndexOf(".");
    if (lastDot === -1) return null;

    const payload = decoded.slice(0, lastDot);
    const signature = decoded.slice(lastDot + 1);
    const expected = crypto
      .createHmac("sha256", getSecret())
      .update(payload)
      .digest("hex");

    if (signature !== expected) return null;

    const data = JSON.parse(payload) as { userId: string; exp: number };
    if (Date.now() > data.exp) return null;

    return { userId: data.userId };
  } catch {
    return null;
  }
}

export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const verified = verifySessionToken(token);
  if (!verified) return null;

  return prisma.user.findUnique({
    where: { id: verified.userId },
    select: { id: true, email: true, name: true, role: true },
  });
}

export async function setSession(userId: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, signSession(userId), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_MAX_AGE,
    path: "/",
  });
}

export async function clearSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

export async function requireAuth(): Promise<SessionUser> {
  const session = await getSession();
  if (!session) {
    throw new Error("UNAUTHORIZED");
  }
  return session;
}

export async function requireAdmin(): Promise<SessionUser> {
  const session = await requireAuth();
  if (!isAdmin(session.role)) {
    throw new Error("FORBIDDEN");
  }
  return session;
}
