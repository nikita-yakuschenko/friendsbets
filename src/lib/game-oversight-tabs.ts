import { gamePlatformViewPath } from "@/lib/game-platform-view";

export type GameOversightTabId =
  | "general"
  | "participants"
  | "leaderboard"
  | "missing";

export const GAME_OVERSIGHT_TABS: { id: GameOversightTabId; label: string }[] = [
  { id: "general", label: "Общее" },
  { id: "participants", label: "Участники" },
  { id: "leaderboard", label: "Таблица" },
  { id: "missing", label: "Кто не поставил" },
];

export function parseGameOversightTab(
  raw: string | undefined,
): "general" | "participants" {
  return raw === "participants" ? "participants" : "general";
}

export function gameOversightTabHref(
  inviteCode: string,
  tab: GameOversightTabId,
): string {
  if (tab === "leaderboard") {
    return gamePlatformViewPath(inviteCode, "leaderboard");
  }
  if (tab === "missing") {
    return gamePlatformViewPath(inviteCode, "control");
  }
  const base = gamePlatformViewPath(inviteCode);
  if (tab === "general") return base;
  return `${base}&tab=participants`;
}
