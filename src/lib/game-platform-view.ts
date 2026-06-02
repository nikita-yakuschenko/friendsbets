import { gamePath } from "@/lib/game-path";

/** Ссылка на турнир в режиме просмотра платформы (без вступления, без прогнозов). */
export function gamePlatformViewPath(
  inviteCode: string,
  segment?: string,
): string {
  const base = segment ? gamePath(inviteCode, segment) : gamePath(inviteCode);
  return `${base}?as=platform`;
}

export function isPlatformViewQuery(raw: string | undefined): boolean {
  return raw === "platform";
}
