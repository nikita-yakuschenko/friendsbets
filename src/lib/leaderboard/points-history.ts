import { isKnockoutStage } from "@/lib/match-stage";
import { pickCanonicalPredictionScore } from "@/lib/scoring/prediction-score-record";

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
    homeScore: number | null;
    awayScore: number | null;
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

export function buildPointsHistoryEntries(params: {
  predictions: PredictionWithScore[];
  championPick: BonusPick | null;
  championAwardedAt: Date | null;
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

      entries.push({
        id: score.id,
        kind: "match",
        points: score.points,
        reason: score.reason,
        awardedAt: score.calculatedAt,
        stage: prediction.match.stage,
        startsAt: prediction.match.startsAt,
        homeTeam: prediction.match.homeTeam,
        awayTeam: prediction.match.awayTeam,
        predictedHome: prediction.homeScore,
        predictedAway: prediction.awayScore,
        actualHome: prediction.match.homeScore,
        actualAway: prediction.match.awayScore,
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
  const knockout = matches
    .filter((match) => isKnockoutStage(match.stage))
    .sort((a, b) => b.startsAt.getTime() - a.startsAt.getTime());

  const finalMatch = knockout[0];
  if (!finalMatch) return null;

  return finalMatch.championatFinishedAt ?? finalMatch.startsAt;
}
