import type { LivePredictionStats } from "@/lib/live-match-stats";
import { cn } from "@/lib/utils";

type FriendPrediction =
  | {
      userId: string;
      displayName: string;
      homeScore: number;
      awayScore: number;
    }
  | {
      userId: string;
      displayName: string;
      hasPrediction: true;
    };

export type LiveMatchPredictionsPanelProps = {
  myPrediction?: {
    homeScore: number;
    awayScore: number;
  } | null;
  friendPredictions: FriendPrediction[];
  stats: LivePredictionStats | null;
  hideFriendScores?: boolean;
};

function LiveStats({ stats }: { stats: LivePredictionStats }) {
  return (
    <div className="rounded-xl bg-brand-bg px-3 py-3">
      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-brand-muted">
        Статистика прогнозов
      </p>
      <div className="space-y-2 text-sm text-brand-muted">
        <p>
          <span className="text-white">{stats.total}</span>{" "}
          {stats.total === 1 ? "прогноз" : stats.total < 5 ? "прогноза" : "прогнозов"}
          {stats.mostCommonScore ? (
            <>
              {" · чаще всего "}
              <span className="font-semibold tabular-nums text-white">
                {stats.mostCommonScore.replace(":", " : ")}
              </span>
              {stats.mostCommonCount > 1 ? ` (${stats.mostCommonCount})` : null}
            </>
          ) : null}
        </p>
        <p className="tabular-nums">
          П1{" "}
          <span className="font-semibold text-white">{stats.homeWin}</span>
          {" · "}
          X <span className="font-semibold text-white">{stats.draw}</span>
          {" · "}
          П2 <span className="font-semibold text-white">{stats.awayWin}</span>
        </p>
        {stats.exactAtCurrentScore != null && stats.exactAtCurrentScore > 0 ? (
          <p>
            Точный счёт сейчас у{" "}
            <span className="font-semibold text-brand-lime">
              {stats.exactAtCurrentScore}
            </span>
          </p>
        ) : null}
      </div>
    </div>
  );
}

function PredictionRow({
  name,
  homeScore,
  awayScore,
  highlight = false,
}: {
  name: string;
  homeScore: number;
  awayScore: number;
  highlight?: boolean;
}) {
  return (
    <li
      className={cn(
        "flex items-center justify-between gap-3 rounded-xl px-3 py-2",
        highlight ? "bg-brand-lime/10" : "bg-brand-bg",
      )}
    >
      <span className={cn("min-w-0 break-words", highlight && "text-brand-lime")}>
        {name}
      </span>
      <span className="shrink-0 font-semibold tabular-nums text-white">
        {homeScore} : {awayScore}
      </span>
    </li>
  );
}

export function LiveMatchPredictionsPanel({
  myPrediction,
  friendPredictions,
  stats,
  hideFriendScores = false,
}: LiveMatchPredictionsPanelProps) {
  return (
    <>
      {stats ? <LiveStats stats={stats} /> : null}

      <div className={stats ? "mt-4" : ""}>
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-brand-muted">
          Ваш прогноз
        </p>
        {myPrediction ? (
          <PredictionRow
            name="Вы"
            homeScore={myPrediction.homeScore}
            awayScore={myPrediction.awayScore}
            highlight
          />
        ) : (
          <p className="rounded-xl bg-brand-bg px-3 py-2 text-sm text-brand-muted">
            Прогноз не сделан
          </p>
        )}
      </div>

      <div className="mt-4">
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-brand-muted">
          {hideFriendScores ? "Участники с прогнозом" : "Прогнозы друзей"}
        </p>
        {friendPredictions.length === 0 ? (
          <p className="rounded-xl bg-brand-bg px-3 py-2 text-sm text-brand-muted">
            {hideFriendScores
              ? "Пока никто не поставил"
              : "Пока никто из друзей не поставил"}
          </p>
        ) : (
          <ul className="space-y-2">
            {friendPredictions.map((prediction) =>
              hideFriendScores || "hasPrediction" in prediction ? (
                <li
                  key={prediction.userId}
                  className="flex items-center justify-between gap-3 rounded-xl bg-brand-bg px-3 py-2 text-sm"
                >
                  <span className="text-white">{prediction.displayName}</span>
                  <span className="shrink-0 text-brand-lime">Сделан</span>
                </li>
              ) : (
                <PredictionRow
                  key={prediction.userId}
                  name={prediction.displayName}
                  homeScore={prediction.homeScore}
                  awayScore={prediction.awayScore}
                />
              ),
            )}
          </ul>
        )}
      </div>
    </>
  );
}
