import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { TeamLabel } from "@/components/team/team-label";
import type { LivePredictionStats } from "@/lib/live-match-stats";
import { formatMatchVenue } from "@/lib/venue";
import { cn, formatDateTimeMoscow } from "@/lib/utils";

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

type LiveMatchCardProps = {
  match: {
    startsAt: Date;
    status: string;
    stage: string | null;
    venueName: string | null;
    venueCity: string | null;
    homeScore: number | null;
    awayScore: number | null;
    homePenaltyScore: number | null;
    awayPenaltyScore: number | null;
    homeTeam: { name: string; countryCode: string | null };
    awayTeam: { name: string; countryCode: string | null };
  };
  myPrediction?: {
    homeScore: number;
    awayScore: number;
  } | null;
  friendPredictions: FriendPrediction[];
  stats: LivePredictionStats | null;
  /** Режим суперадмина: только факт прогноза, без чужих счётов */
  hideFriendScores?: boolean;
};

function LiveBadge({ status }: { status: string }) {
  const isLive = status === "LIVE";

  return (
    <Badge
      variant={isLive ? "destructive" : "secondary"}
      className={cn(
        "gap-1.5 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide",
        isLive
          ? "border-brand-red/40 bg-brand-red/10 text-brand-red"
          : "border-brand-neutral bg-brand-neutral/20 text-brand-muted",
      )}
    >
      {isLive ? (
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-brand-red live-pulse-dot" />
      ) : null}
      {isLive ? "В эфире" : "Идёт матч"}
    </Badge>
  );
}

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

export function LiveMatchCard({
  match,
  myPrediction,
  friendPredictions,
  stats,
  hideFriendScores = false,
}: LiveMatchCardProps) {
  const venue = formatMatchVenue(match.venueName, match.venueCity);
  const homeScore = match.homeScore ?? 0;
  const awayScore = match.awayScore ?? 0;
  const hasPenalties =
    match.homePenaltyScore != null && match.awayPenaltyScore != null;
  const hasLiveScore = match.homeScore != null && match.awayScore != null;

  return (
    <Card className="overflow-hidden border-brand-red/20 p-0">
      <CardContent className="px-4 py-4">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <LiveBadge status={match.status} />
          {match.stage ? (
            <p className="text-sm text-brand-muted">{match.stage}</p>
          ) : null}
        </div>

        <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3">
          <div className="flex justify-end">
            <TeamLabel
              name={match.homeTeam.name}
              countryCode={match.homeTeam.countryCode}
              flagPosition="after"
              className="text-base font-semibold sm:text-lg"
            />
          </div>

          <div className="flex flex-col items-center gap-1">
            {hasLiveScore ? (
              <p className="text-3xl font-bold tabular-nums tracking-tight text-white sm:text-4xl">
                {homeScore}
                <span className="mx-1 text-brand-muted">:</span>
                {awayScore}
              </p>
            ) : (
              <p className="text-2xl font-semibold text-brand-muted">— : —</p>
            )}
            {hasPenalties ? (
              <p className="text-xs text-brand-muted tabular-nums">
                пен. {match.homePenaltyScore}:{match.awayPenaltyScore}
              </p>
            ) : null}
          </div>

          <TeamLabel
            name={match.awayTeam.name}
            countryCode={match.awayTeam.countryCode}
            flagPosition="before"
            className="text-base font-semibold sm:text-lg"
          />
        </div>

        <div className="mt-3 space-y-1 text-center text-sm text-brand-muted">
          <p>{formatDateTimeMoscow(match.startsAt)}</p>
          {venue ? <p>{venue}</p> : null}
        </div>

        {stats ? (
          <div className="mt-4">
            <LiveStats stats={stats} />
          </div>
        ) : null}

        <div className="mt-4">
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
      </CardContent>
    </Card>
  );
}
