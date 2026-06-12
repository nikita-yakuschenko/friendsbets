import { LiveMatchEventIcon } from "@/components/game/live-match-event-icon";
import type { ChampionatLivePhase } from "@/lib/football-api/championat/match-live-phase";
import type { ChampionatMatchEvent } from "@/lib/football-api/championat/match-protocol-types";
import { cn } from "@/lib/utils";

type LiveMatchEventsListProps = {
  events: ChampionatMatchEvent[];
  livePhase: ChampionatLivePhase;
  matchStatus?: string;
  homeTeamName: string;
  awayTeamName: string;
  loading?: boolean;
  error?: string | null;
  syncWarning?: string | null;
};

function sortByMinute(events: ChampionatMatchEvent[]): ChampionatMatchEvent[] {
  return [...events].sort((a, b) => {
    const ma = a.minute ?? 9999;
    const mb = b.minute ?? 9999;
    if (ma !== mb) return ma - mb;
    return a.playerName.localeCompare(b.playerName, "ru");
  });
}

function ScoreBadge({ score }: { score: string }) {
  return (
    <span className="inline-flex min-w-[2.25rem] items-center justify-center rounded bg-white/10 px-1.5 py-0.5 text-xs font-semibold tabular-nums text-white">
      {score}
    </span>
  );
}

function ProtocolEventRow({ event }: { event: ChampionatMatchEvent }) {
  const isAway = event.teamSide === "away";
  const isGoal = event.section === "goals";

  return (
    <li
      className={cn(
        "flex items-center gap-2 border-b border-white/5 py-2.5 last:border-b-0 sm:gap-3",
        isAway ? "flex-row-reverse" : "flex-row",
      )}
    >
      <div
        className={cn(
          "flex min-w-0 flex-1 flex-col gap-0.5",
          isAway ? "items-end text-right" : "items-start text-left",
        )}
      >
        <span className="text-sm font-medium leading-snug text-white">
          {event.playerName}
        </span>
        {event.assistName ? (
          <span className="text-xs text-brand-muted">{event.assistName}</span>
        ) : null}
      </div>

      <div className="flex shrink-0 items-center justify-center">
        {isGoal && event.score ? (
          <ScoreBadge score={event.score} />
        ) : (
          <LiveMatchEventIcon type={event.type} />
        )}
      </div>

      <span className="w-9 shrink-0 text-center text-sm font-medium tabular-nums text-brand-muted">
        {event.minuteLabel}
      </span>
    </li>
  );
}

function ProtocolSection({
  title,
  events,
}: {
  title: string;
  events: ChampionatMatchEvent[];
}) {
  if (events.length === 0) return null;

  return (
    <section>
      <h3 className="mb-2 text-sm font-semibold text-white">{title}</h3>
      <ul className="rounded-xl bg-brand-bg px-3 py-1">
        {events.map((event) => (
          <ProtocolEventRow key={event.id} event={event} />
        ))}
      </ul>
    </section>
  );
}

export function LiveMatchEventsList({
  events,
  loading,
  error,
  syncWarning,
}: LiveMatchEventsListProps) {
  const goals = sortByMinute(events.filter((e) => e.section === "goals"));
  const punishments = sortByMinute(
    events.filter((e) => e.section === "punishments"),
  );
  const hasEvents = goals.length > 0 || punishments.length > 0;

  if (loading && !hasEvents) {
    return (
      <p className="rounded-xl bg-brand-bg px-3 py-6 text-center text-sm text-brand-muted">
        Загрузка протокола…
      </p>
    );
  }

  if (error) {
    return (
      <p className="rounded-xl border border-brand-red/30 bg-brand-bg px-3 py-4 text-center text-sm text-brand-muted">
        {error}
      </p>
    );
  }

  if (!hasEvents) {
    return (
      <div className="space-y-3">
        {syncWarning ? (
          <p className="rounded-xl border border-brand-neutral/60 bg-brand-bg px-3 py-3 text-center text-sm text-brand-muted">
            {syncWarning}
          </p>
        ) : null}
        <p className="rounded-xl bg-brand-bg px-3 py-6 text-center text-sm text-brand-muted">
          Пока нет событий в протоколе матча.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {syncWarning ? (
        <p className="rounded-xl border border-brand-neutral/60 bg-brand-bg px-3 py-3 text-center text-sm text-brand-muted">
          {syncWarning}
        </p>
      ) : null}
      <ProtocolSection title="Голы" events={goals} />
      <ProtocolSection title="Наказания" events={punishments} />
    </div>
  );
}
