import type { LivePredictionStats } from "@/lib/live-match-stats";
import {
  teamAccusative,
  teamBeliefPronoun,
  teamBelievedForm,
  teamGenitive,
  teamNominative,
} from "@/lib/team-name-declension";
import { resolveTeamFlagCode } from "@/lib/teams";

export type PredictionWithName = {
  displayName: string;
  homeScore: number;
  awayScore: number;
};

export type PredictionStatsCommentaryInput = {
  stats: LivePredictionStats;
  seed: string;
  homeTeam: { name: string; countryCode: string | null };
  awayTeam: { name: string; countryCode: string | null };
  predictions: PredictionWithName[];
};

type TeamRef = { name: string; countryCode: string | null };

type TeamPhrases = {
  nom: string;
  acc: string;
  gen: string;
  believed: string;
  beliefIn: string;
};

type Scenario =
  | { kind: "solo"; name: string; outcome: "home" | "away" | "draw" }
  | { kind: "unanimous_score"; score: string; total: number }
  | { kind: "unanimous_draw" }
  | { kind: "unanimous_home"; total: number }
  | { kind: "unanimous_away"; total: number }
  | { kind: "lone_home"; loneName: string }
  | { kind: "lone_away"; loneName: string }
  | { kind: "split"; homeWin: number; awayWin: number }
  | { kind: "draw_heavy"; draw: number; total: number }
  | {
      kind: "majority_home";
      homeWin: number;
      awayWin: number;
      draw: number;
      total: number;
    }
  | {
      kind: "majority_away";
      homeWin: number;
      awayWin: number;
      draw: number;
      total: number;
    }
  | { kind: "fallback"; total: number };

function countryCodeToFlagEmoji(code: string | null | undefined): string {
  if (!code || code.length !== 2) return "";
  const upper = code.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(upper)) return "";
  return String.fromCodePoint(
    ...[...upper].map((char) => 0x1f1e6 + char.charCodeAt(0) - 65),
  );
}

function flagPrefix(team: TeamRef): string {
  const flag = countryCodeToFlagEmoji(
    resolveTeamFlagCode(team.name, team.countryCode),
  );
  return flag ? `${flag} ` : "";
}

function teamPhrases(team: TeamRef): TeamPhrases {
  const name = teamNominative(team.name);
  return {
    nom: `${flagPrefix(team)}${name}`,
    acc: `${flagPrefix(team)}${teamAccusative(name)}`,
    gen: teamGenitive(name),
    believed: teamBelievedForm(name),
    beliefIn: teamBeliefPronoun(name),
  };
}

function pickVariant(items: string[], seed: string): string {
  if (items.length === 0) return "";
  let hash = 0;
  for (const char of seed) {
    hash = (hash * 31 + char.charCodeAt(0)) | 0;
  }
  return items[Math.abs(hash) % items.length]!;
}

function predictionOutcome(
  prediction: PredictionWithName,
): "home" | "away" | "draw" {
  if (prediction.homeScore > prediction.awayScore) return "home";
  if (prediction.homeScore < prediction.awayScore) return "away";
  return "draw";
}

function lonePredictorName(
  predictions: PredictionWithName[],
  side: "home" | "away",
): string {
  const match = predictions.find((prediction) => predictionOutcome(prediction) === side);
  return match?.displayName ?? "Кто-то";
}

function classifyScenario(
  stats: LivePredictionStats,
  predictions: PredictionWithName[],
): Scenario {
  const { total, homeWin, awayWin, draw, mostCommonCount, mostCommonScore } =
    stats;

  if (total === 1) {
    const only = predictions[0];
    return {
      kind: "solo",
      name: only?.displayName ?? "Кто-то",
      outcome: only ? predictionOutcome(only) : "home",
    };
  }

  if (mostCommonCount === total && mostCommonScore) {
    return {
      kind: "unanimous_score",
      score: mostCommonScore.replace(":", " : "),
      total,
    };
  }

  if (draw === total) return { kind: "unanimous_draw" };
  if (homeWin === total) return { kind: "unanimous_home", total };
  if (awayWin === total) return { kind: "unanimous_away", total };

  if (homeWin === 1 && awayWin >= 2) {
    return {
      kind: "lone_home",
      loneName: lonePredictorName(predictions, "home"),
    };
  }

  if (awayWin === 1 && homeWin >= 2) {
    return {
      kind: "lone_away",
      loneName: lonePredictorName(predictions, "away"),
    };
  }

  if (draw >= 2 && draw > homeWin && draw > awayWin) {
    return { kind: "draw_heavy", draw, total };
  }

  if (
    homeWin >= 1 &&
    awayWin >= 1 &&
    Math.abs(homeWin - awayWin) <= 1
  ) {
    return { kind: "split", homeWin, awayWin };
  }

  if (homeWin > awayWin && homeWin >= 2) {
    return { kind: "majority_home", homeWin, awayWin, draw, total };
  }

  if (awayWin > homeWin && awayWin >= 2) {
    return { kind: "majority_away", homeWin, awayWin, draw, total };
  }

  return { kind: "fallback", total };
}

function commentaryForScenario(
  scenario: Scenario,
  home: TeamRef,
  away: TeamRef,
  seed: string,
): string {
  const homeTeam = teamPhrases(home);
  const awayTeam = teamPhrases(away);

  switch (scenario.kind) {
    case "solo": {
      const target =
        scenario.outcome === "home"
          ? homeTeam.acc
          : scenario.outcome === "away"
            ? awayTeam.acc
            : "ничью";
      return pickVariant(
        [
          `${scenario.name} один против системы — зато прогноз уже есть, и он за ${target}.`,
          `Один прогноз, ноль сомнений: ${scenario.name} ставит на ${target}. Смело!`,
          `Турнир ждёт: ${scenario.name} уже сделал ставку на ${target}. Остальные догоняют.`,
        ],
        `${seed}:solo`,
      );
    }

    case "unanimous_score":
      return pickVariant(
        [
          "Ну фантазии, конечно, нет у нас, ребятки… Ну да ладно, смотрим — чутьё не бывает ложным, особенно коллективное.",
          `Все сошлись на ${scenario.score}. Фантазии нет, зато коллективное чутьё — штука серьёзная.`,
          `Один счёт на всех — ${scenario.score}. Скучно? Может. Но согласованно — точно.`,
        ],
        `${seed}:unanimous_score`,
      );

    case "unanimous_draw":
      return pickVariant(
        [
          "Все поставили на ничью. Не знаешь, на кого ставить — ставь X, да?",
          "Сто процентов ничьих. Силы равны, нервы — тоже.",
          "Коллективное «0:0 или что-то около того». Классика осторожных душ.",
        ],
        `${seed}:unanimous_draw`,
      );

    case "unanimous_home":
      return pickVariant(
        [
          `Единогласно за ${homeTeam.acc}. ${awayTeam.nom} пока без единого голоса доверия.`,
          `Все ${scenario.total} прогноза — на хозяев. ${homeTeam.nom} в полном почёте.`,
          `Консенсус: победа ${homeTeam.gen}. У ${awayTeam.gen} задача — разрушить план.`,
        ],
        `${seed}:unanimous_home`,
      );

    case "unanimous_away":
      return pickVariant(
        [
          `Единогласно за ${awayTeam.acc}. ${homeTeam.nom} в меньшинстве ещё до свистка.`,
          `Все ставят на гостей — ${awayTeam.nom} в фаворитах у всего турнира.`,
          `Полный консенсус за ${awayTeam.acc}. Хозяевам придётся отвечать на поле.`,
        ],
        `${seed}:unanimous_away`,
      );

    case "lone_home":
      return pickVariant(
        [
          `Один в поле воин! Главное, чтобы ${homeTeam.nom} ${homeTeam.believed} в себя так же сильно, как в ${homeTeam.beliefIn} верит ${scenario.loneName} — единственный, кто поставил на хозяев.`,
          `${scenario.loneName} один против толпы за ${awayTeam.acc}. ${homeTeam.nom}, не подведите своего рыцаря!`,
          `Один голос за ${homeTeam.acc} — это ${scenario.loneName}. Остальные смотрят на ${awayTeam.acc}. Смелость или безумие?`,
        ],
        `${seed}:lone_home`,
      );

    case "lone_away":
      return pickVariant(
        [
          `Один в поле воин! Главное, чтобы ${awayTeam.nom} ${awayTeam.believed} в себя так же сильно, как в ${awayTeam.beliefIn} верит ${scenario.loneName} — единственный, кто поставил на гостей.`,
          `${scenario.loneName} один тянет знамя ${awayTeam.gen}. Большинство за ${homeTeam.acc} — но футбол любит сюрпризы.`,
          `Один прогноз на ${awayTeam.acc}, и это ${scenario.loneName}. Все остальные за ${homeTeam.acc}. Интрига на месте.`,
        ],
        `${seed}:lone_away`,
      );

    case "split":
      return pickVariant(
        [
          "Мнения разделись — видимо, нас ждёт славная битва!",
          `Почти поровну: ${scenario.homeWin} за ${homeTeam.acc}, ${scenario.awayWin} за ${awayTeam.acc}. Кто-то точно прогорит.`,
          `Спор до хрипоты — ${scenario.homeWin} против ${scenario.awayWin}. Букмекеры бы аплодировали.`,
          `Лагеря сформировались: ${homeTeam.nom} и ${awayTeam.nom} делят прогнозы пополам. Ждём развязки.`,
        ],
        `${seed}:split`,
      );

    case "draw_heavy":
      return pickVariant(
        [
          "Игра была равна, играли два г..., ну ладно, ладно — все мы знаем: не знаешь, на что ставить, ставь ничью.",
          `${scenario.draw} ничьих из ${scenario.total} — классика «а вдруг сойдётся».`,
          `Ничья в моде: ${scenario.draw} человек решили, что силы равны. Смелые... или просто осторожные.`,
          `Много иксов — ${scenario.draw} из ${scenario.total}. Когда сомневаешься, ставь X.`,
        ],
        `${seed}:draw_heavy`,
      );

    case "majority_home":
      return pickVariant(
        [
          `${scenario.homeWin} из ${scenario.total} за ${homeTeam.acc} — большинство не ошибается... обычно.`,
          `Фаворит очевиден: ${homeTeam.nom} (${scenario.homeWin} голосов). ${scenario.awayWin > 0 ? `${scenario.awayWin} всё ещё верят в ${awayTeam.acc}.` : "Меньшинства почти нет."}`,
          `Перевес за хозяев: ${scenario.homeWin} против ${scenario.awayWin + scenario.draw}. ${homeTeam.nom} ждут победы.`,
        ],
        `${seed}:majority_home`,
      );

    case "majority_away":
      return pickVariant(
        [
          `${scenario.awayWin} из ${scenario.total} за ${awayTeam.acc} — большинство не ошибается... обычно.`,
          `Фаворит очевиден: ${awayTeam.nom} (${scenario.awayWin} голосов). ${scenario.homeWin > 0 ? `${scenario.homeWin} всё ещё верят в ${homeTeam.acc}.` : "Меньшинства почти нет."}`,
          `Перевес за гостей: ${scenario.awayWin} против ${scenario.homeWin + scenario.draw}. ${awayTeam.nom} в фаворитах.`,
        ],
        `${seed}:majority_away`,
      );

    case "fallback":
      return pickVariant(
        [
          `${scenario.total} прогнозов — и ни один не скучный. Посмотрим, кто угадал.`,
          "Статистика собрана, интрига на месте. Мяч решит, кто был прав.",
          "Разброс мнений есть — значит, матч будет интересным. Или болезненным для кошелька.",
        ],
        `${seed}:fallback`,
      );
  }
}

export function buildPredictionStatsCommentary(
  input: PredictionStatsCommentaryInput,
): string {
  const scenario = classifyScenario(input.stats, input.predictions);
  return commentaryForScenario(
    scenario,
    input.homeTeam,
    input.awayTeam,
    input.seed,
  );
}
