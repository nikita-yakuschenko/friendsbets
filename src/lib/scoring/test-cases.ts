/**
 * Manual test cases for scoring rules.
 * Run with: npx tsx src/lib/scoring/test-cases.ts
 */
import {
  scoreDifferenceDecides,
  scoreDryNumbers,
  scoreFootballClassic,
  scoreManyPoints,
} from "@/lib/scoring/rules";

const base = {
  actualHome: 2,
  actualAway: 1,
};

const cases = [
  { name: "exact", predictedHome: 2, predictedAway: 1 },
  { name: "outcome only", predictedHome: 3, predictedAway: 0 },
  { name: "wrong", predictedHome: 0, predictedAway: 2 },
  { name: "one team goals", predictedHome: 2, predictedAway: 0 },
];

for (const testCase of cases) {
  const input = { ...base, ...testCase };
  console.log(testCase.name, {
    classic: scoreFootballClassic(input),
    many: scoreManyPoints(input),
    diff: scoreDifferenceDecides(input),
    dry: scoreDryNumbers(input),
  });
}
