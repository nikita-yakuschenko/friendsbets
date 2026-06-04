/** Режим доступа в турнир — без импорта Prisma в браузер. */

export const GAME_ACCESS_MODE = {
  OPEN: "OPEN",
  REQUEST: "REQUEST",
} as const;

export type GameAccessModeValue =
  (typeof GAME_ACCESS_MODE)[keyof typeof GAME_ACCESS_MODE];

export const GAME_ACCESS_MODE_LABELS: Record<GameAccessModeValue, string> = {
  [GAME_ACCESS_MODE.OPEN]: "Свободный",
  [GAME_ACCESS_MODE.REQUEST]: "По заявке",
};

/** Порядок для UI: сначала режим по умолчанию. */
export const GAME_ACCESS_MODE_OPTIONS: ReadonlyArray<{
  value: GameAccessModeValue;
  label: string;
}> = [
  { value: GAME_ACCESS_MODE.REQUEST, label: GAME_ACCESS_MODE_LABELS.REQUEST },
  { value: GAME_ACCESS_MODE.OPEN, label: GAME_ACCESS_MODE_LABELS.OPEN },
];

export function parseGameAccessModeInput(value: string): GameAccessModeValue {
  return value === GAME_ACCESS_MODE.REQUEST
    ? GAME_ACCESS_MODE.REQUEST
    : GAME_ACCESS_MODE.OPEN;
}
