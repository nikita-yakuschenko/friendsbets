export type ScoreInput = {
  predictedHome: number;
  predictedAway: number;
  actualHome: number;
  actualAway: number;
  /** Ничья в основное время + пенальти: исход для сравнения (классика). */
  actualOutcomeOverride?: "home" | "away" | "draw";
};

export type ScoreTier =
  | "exact"
  | "outcome_and_diff"
  | "outcome_and_team_goals"
  | "outcome"
  | "team_goals"
  | "none";

export type ScoreResult = {
  points: number;
  reason: string;
  tier: ScoreTier;
};

function exactScore(input: ScoreInput): boolean {
  return (
    input.predictedHome === input.actualHome &&
    input.predictedAway === input.actualAway
  );
}

function predictedOutcome(input: ScoreInput): "home" | "away" | "draw" | null {
  if (input.predictedHome > input.predictedAway) return "home";
  if (input.predictedAway > input.predictedHome) return "away";
  if (input.predictedHome === input.predictedAway) return "draw";
  return null;
}

function actualOutcome(input: ScoreInput): "home" | "away" | "draw" | null {
  if (input.actualOutcomeOverride) return input.actualOutcomeOverride;
  if (input.actualHome > input.actualAway) return "home";
  if (input.actualAway > input.actualHome) return "away";
  if (input.actualHome === input.actualAway) return "draw";
  return null;
}

function outcomeMatched(input: ScoreInput): boolean {
  return predictedOutcome(input) === actualOutcome(input);
}

function goalDifference(input: ScoreInput): number {
  return input.actualHome - input.actualAway;
}

function predictedGoalDifference(input: ScoreInput): number {
  return input.predictedHome - input.predictedAway;
}

function oneTeamGoalsMatched(input: ScoreInput): boolean {
  return (
    input.predictedHome === input.actualHome ||
    input.predictedAway === input.actualAway
  );
}

export function scoreFootballClassic(input: ScoreInput): ScoreResult {
  if (exactScore(input)) {
    return { points: 3, reason: "Точный счёт", tier: "exact" };
  }
  if (outcomeMatched(input)) {
    return { points: 1, reason: "Угадан исход", tier: "outcome" };
  }
  return { points: 0, reason: "Не угадано", tier: "none" };
}

export function scoreManyPoints(input: ScoreInput): ScoreResult {
  if (exactScore(input)) {
    return { points: 6, reason: "Точный счёт", tier: "exact" };
  }
  if (
    outcomeMatched(input) &&
    predictedGoalDifference(input) === goalDifference(input)
  ) {
    return { points: 5, reason: "Исход и разница мячей", tier: "outcome_and_diff" };
  }
  if (outcomeMatched(input) && oneTeamGoalsMatched(input)) {
    return {
      points: 4,
      reason: "Исход и голы одной команды",
      tier: "outcome_and_team_goals",
    };
  }
  if (outcomeMatched(input)) {
    return { points: 3, reason: "Угадан исход", tier: "outcome" };
  }
  if (oneTeamGoalsMatched(input)) {
    return { points: 1, reason: "Голы одной команды", tier: "team_goals" };
  }
  return { points: 0, reason: "Не угадано", tier: "none" };
}

export function scoreDifferenceDecides(input: ScoreInput): ScoreResult {
  if (exactScore(input)) {
    return { points: 3, reason: "Точный счёт", tier: "exact" };
  }
  if (
    outcomeMatched(input) &&
    predictedGoalDifference(input) === goalDifference(input)
  ) {
    return { points: 2, reason: "Исход и разница мячей", tier: "outcome_and_diff" };
  }
  if (outcomeMatched(input)) {
    return { points: 1, reason: "Угадан исход", tier: "outcome" };
  }
  return { points: 0, reason: "Не угадано", tier: "none" };
}

export function scoreDryNumbers(input: ScoreInput): ScoreResult {
  if (exactScore(input)) {
    return { points: 4, reason: "Точный счёт", tier: "exact" };
  }
  if (outcomeMatched(input) && oneTeamGoalsMatched(input)) {
    return {
      points: 3,
      reason: "Исход и голы одной команды",
      tier: "outcome_and_team_goals",
    };
  }
  if (outcomeMatched(input)) {
    return { points: 2, reason: "Угадан исход", tier: "outcome" };
  }
  if (oneTeamGoalsMatched(input)) {
    return { points: 1, reason: "Голы одной команды", tier: "team_goals" };
  }
  return { points: 0, reason: "Не угадано", tier: "none" };
}
