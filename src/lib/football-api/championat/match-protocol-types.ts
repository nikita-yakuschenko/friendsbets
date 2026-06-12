export type ChampionatMatchEventType =
  | "GOAL"
  | "PENALTY_GOAL"
  | "OWN_GOAL"
  | "YELLOW_CARD"
  | "RED_CARD"
  | "UNKNOWN";

export type ChampionatMatchEventSection = "goals" | "punishments";

export type ChampionatMatchEvent = {
  id: string;
  type: ChampionatMatchEventType;
  minute: number | null;
  minuteLabel: string;
  playerName: string;
  assistName?: string;
  /** Гол: имя ассистента. Наказание: тип карточки / причина (вторая строка в UI). */
  score?: string;
  teamSide?: "home" | "away";
  section: ChampionatMatchEventSection;
};

export const CHAMPIONAT_EVENT_LABELS: Record<ChampionatMatchEventType, string> = {
  GOAL: "Гол",
  PENALTY_GOAL: "Гол (пенальти)",
  OWN_GOAL: "Автогол",
  YELLOW_CARD: "Жёлтая карточка",
  RED_CARD: "Красная карточка",
  UNKNOWN: "Событие",
};
