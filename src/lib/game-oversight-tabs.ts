import { gamePath } from "@/lib/game-path";
import { gamePlatformViewPath } from "@/lib/game-platform-view";

export type GameOversightTabId =
  | "general"
  | "participants"
  | "leaderboard"
  | "missing"
  | "champion-bet";

export const GAME_OVERSIGHT_TABS: { id: GameOversightTabId; label: string }[] = [
  { id: "general", label: "Общее" },
  { id: "participants", label: "Участники" },
  { id: "leaderboard", label: "Таблица" },
  { id: "missing", label: "Кто не поставил" },
  { id: "champion-bet", label: "Ставка на чемпиона" },
];

export function parseGameOversightTab(
  raw: string | undefined,
): "general" | "participants" {
  return raw === "participants" ? "participants" : "general";
}

export function gameOversightTabHref(
  inviteCode: string,
  tab: GameOversightTabId,
  platformTabLinks = true,
): string {
  const path = (segment?: string) =>
    platformTabLinks
      ? gamePlatformViewPath(inviteCode, segment)
      : segment
        ? gamePath(inviteCode, segment)
        : gamePath(inviteCode);

  if (tab === "leaderboard") {
    return path("leaderboard");
  }
  if (tab === "missing") {
    return path("control");
  }
  if (tab === "champion-bet") {
    return path("champion-bet");
  }
  const base = path();
  if (tab === "general") return base;
  return platformTabLinks ? `${base}&tab=participants` : `${base}?tab=participants`;
}
