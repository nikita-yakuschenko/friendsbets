import { buildSyntheticRegulationScore } from "@/lib/scoring/penalty-scoring-mode";
import { pickCanonicalPredictionScore } from "@/lib/scoring/prediction-score-record";
import { isFinalStage } from "@/lib/match-stage";

export type PointsHistoryMatchEntry = {
  id: string;
  kind: "match";
  points: number;
  reason: string;
  awardedAt: Date;
  stage: string | null;
  startsAt: Date;
  homeTeam: { name: string; countryCode: string | null };
  awayTeam: { name: string; countryCode: string | null };
  predictedHome: number;
  predictedAway: number;
  actualHome: number;
  actualAway: number;
  actualHomePenaltyScore?: number | null;
  actualAwayPenaltyScore?: number | null;
  /** Счёт для начисления очков (при альтернативе может отличаться от actual). */
  scoringHome: number;
  scoringAway: number;
  usesSyntheticScore: boolean;
};

export type PointsHistoryChampionEntry = {
  id: string;
  kind: "champion";
  points: number;
  reason: string;
  awardedAt: Date;
  teamName: string;
  teamCountryCode: string | null;
};

export type PointsHistoryEntry =
  | PointsHistoryMatchEntry
  | PointsHistoryChampionEntry;

type PredictionWithScore = {
  id: string;
  homeScore: number;
  awayScore: number;
  scores: Array<{
    id: string;
    points: number;
    reason: string;
    calculatedAt: Date;
  }>;
  match: {
    stage: string | null;
    startsAt: Date;
    championatFinishedAt?: Date | null;
    homeScore: number | null;
    awayScore: number | null;
    homePenaltyScore?: number | null;
    awayPenaltyScore?: number | null;
    homeTeam: { name: string; countryCode: string | null };
    awayTeam: { name: string; countryCode: string | null };
  };
};

type BonusPick = {
  id: string;
  points: number;
  team: { name: string; countryCode: string | null };
};

type FinishedKnockoutMatch = {
  stage: string | null;
  championatFinishedAt: Date | null;
  startsAt: Date;
};

/** Момент матча для истории очков — не calculatedAt (ломается при пересчёте). */
export function matchPointsEventAt(match: {
  championatFinishedAt?: Date | null;
  startsAt: Date;
}): Date {
  return match.championatFinishedAt ?? match.startsAt;
}

export function buildPointsHistoryEntries(params: {
  predictions: PredictionWithScore[];
  championPick: BonusPick | null;
  championAwardedAt: Date | null;
  penaltyScoringSynthetic?: boolean;
}): PointsHistoryEntry[] {
  const entries: PointsHistoryEntry[] = [];

  for (const prediction of params.predictions) {
    const score = pickCanonicalPredictionScore(prediction.scores);
    if (!score || score.points <= 0) continue;
      if (
        prediction.match.homeScore === null ||
        prediction.match.awayScore === null
      ) {
        continue;
      }

      const synthetic = params.penaltyScoringSynthetic
        ? buildSyntheticRegulationScore(prediction.match)
        : null;

      entries.push({
        id: score.id,
        kind: "match",
        points: score.points,
        reason: score.reason,
        awardedAt: matchPointsEventAt(prediction.match),
        stage: prediction.match.stage,
        startsAt: prediction.match.startsAt,
        homeTeam: prediction.match.homeTeam,
        awayTeam: prediction.match.awayTeam,
        predictedHome: prediction.homeScore,
        predictedAway: prediction.awayScore,
        actualHome: prediction.match.homeScore,
        actualAway: prediction.match.awayScore,
        actualHomePenaltyScore: prediction.match.homePenaltyScore ?? null,
        actualAwayPenaltyScore: prediction.match.awayPenaltyScore ?? null,
        scoringHome: synthetic?.homeScore ?? prediction.match.homeScore,
        scoringAway: synthetic?.awayScore ?? prediction.match.awayScore,
        usesSyntheticScore: synthetic !== null,
      });
  }

  if (params.championPick && params.championPick.points > 0) {
    entries.push({
      id: params.championPick.id,
      kind: "champion",
      points: params.championPick.points,
      reason: "Ставка на чемпиона",
      awardedAt: params.championAwardedAt ?? new Date(0),
      teamName: params.championPick.team.name,
      teamCountryCode: params.championPick.team.countryCode,
    });
  }

  return entries.sort(
    (a, b) => b.awardedAt.getTime() - a.awardedAt.getTime(),
  );
}

export function resolveChampionAwardedAt(
  matches: FinishedKnockoutMatch[],
): Date | null {
  const finalMatch = matches
    .filter((match) => isFinalStage(match.stage))
    .sort((a, b) => b.startsAt.getTime() - a.startsAt.getTime())[0];
  if (!finalMatch) return null;

  return finalMatch.championatFinishedAt ?? finalMatch.startsAt;
}
