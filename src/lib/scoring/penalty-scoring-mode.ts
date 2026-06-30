import {
  getPenaltyWinnerSide,
  hasMatchPenaltyScore,
} from "@/lib/match-penalty-display";

export type MatchForPenaltyScoring = {
  homeScore: number | null;
  awayScore: number | null;
  homePenaltyScore?: number | null;
  awayPenaltyScore?: number | null;
};

export type PenaltyScoringMode = "classic" | "synthetic";

export function getPenaltyScoringMode(
  penaltyScoringSynthetic: boolean,
): PenaltyScoringMode {
  return penaltyScoringSynthetic ? "synthetic" : "classic";
}

export function getPenaltyScoringModeLabel(
  penaltyScoringSynthetic: boolean,
): string {
  return penaltyScoringSynthetic ? "Альтернатива" : "Классика";
}

/** Ничья в основное время + серия пенальти с победителем. */
export function isPenaltyDecidedDraw(match: MatchForPenaltyScoring): boolean {
  if (match.homeScore === null || match.awayScore === null) return false;
  if (match.homeScore !== match.awayScore) return false;
  if (!hasMatchPenaltyScore(match.homePenaltyScore, match.awayPenaltyScore)) {
    return false;
  }
  return (
    getPenaltyWinnerSide(match.homePenaltyScore!, match.awayPenaltyScore!) !=
    null
  );
}

/** Синтетический счёт для очков: +1 гол команде-победителю серии пенальти. */
export function buildSyntheticRegulationScore(
  match: MatchForPenaltyScoring,
): { homeScore: number; awayScore: number } | null {
  if (!isPenaltyDecidedDraw(match)) return null;
  const home = match.homeScore!;
  const away = match.awayScore!;
  const side = getPenaltyWinnerSide(
    match.homePenaltyScore!,
    match.awayPenaltyScore!,
  );
  if (side === "home") return { homeScore: home + 1, awayScore: away };
  if (side === "away") return { homeScore: home, awayScore: away + 1 };
  return null;
}

export const PENALTY_SCORING_MODE_NOTE_CLASSIC =
  "Метод начисления очков при пенальти: Классика. Прогноз и очки строятся на счёте основного времени (например, 1:1). Серия пенальти не меняет счёт для точного попадания и разницы мячей. Кто прошёл дальше, определяется по пенальти — это учитывается при сравнении исхода с прогнозом. Пример: Германия — Парагвай, 1:1 и пенальти 3:4. Для очков фактический счёт — 1:1; прогноз 1:2 даёт очки за угаданный исход (победа гостей).";

export const PENALTY_SCORING_MODE_NOTE_SYNTHETIC =
  "Метод начисления очков при пенальти: Альтернатива. Если в основное время ничья, а победитель определяется серией пенальти, для начисления очков используется синтетический счёт: команде-победителю в серии добавляется один гол. На экране по-прежнему показываются счёт основного времени и пенальти. Пример: Германия — Парагвай — 1:1, пенальти 3:4 (победа Парагвая). Синтетический счёт для очков: 1:2. Прогноз 1:2 засчитывается как точный счёт по правилам турнира.";

export function getPenaltyScoringModeNote(
  penaltyScoringSynthetic: boolean,
): string {
  return penaltyScoringSynthetic
    ? PENALTY_SCORING_MODE_NOTE_SYNTHETIC
    : PENALTY_SCORING_MODE_NOTE_CLASSIC;
}

/** Счёт для начисления очков (только при альтернативе и ничьей + пенальти). */
export function resolvePointsScoringScore(
  match: MatchForPenaltyScoring,
  penaltyScoringSynthetic: boolean,
): { homeScore: number; awayScore: number } | null {
  if (!penaltyScoringSynthetic) return null;
  return buildSyntheticRegulationScore(match);
}

export function formatPointsScoringScore(
  homeScore: number,
  awayScore: number,
): string {
  return `${homeScore} : ${awayScore}`;
}

export function formatPointsScoringScoreNotice(
  homeScore: number,
  awayScore: number,
): string {
  return `Для очков: ${formatPointsScoringScore(homeScore, awayScore)}`;
}
