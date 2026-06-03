import { GameAccessMode } from "@/generated/prisma/client";

export const GAME_ACCESS_MODE_LABELS: Record<GameAccessMode, string> = {
  [GameAccessMode.OPEN]: "Свободный",
  [GameAccessMode.REQUEST]: "По запросу",
};

export function parseGameAccessModeInput(value: string): GameAccessMode {
  return value === GameAccessMode.REQUEST
    ? GameAccessMode.REQUEST
    : GameAccessMode.OPEN;
}
