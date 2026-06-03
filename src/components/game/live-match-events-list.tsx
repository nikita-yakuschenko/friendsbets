import { LiveMatchEventIcon } from "@/components/game/live-match-event-icon";
import { LiveTimelineMarkerIcon } from "@/components/game/live-timeline-marker-icon";
import { buildLiveTimelineRows } from "@/lib/football-api/championat/build-live-timeline";
import type { ChampionatLivePhase } from "@/lib/football-api/championat/match-live-phase";
import {
  CHAMPIONAT_EVENT_LABELS,
  type ChampionatMatchEvent,
} from "@/lib/football-api/championat/match-protocol-types";
import { cn } from "@/lib/utils";

type LiveMatchEventsListProps = {
  events: ChampionatMatchEvent[];
  livePhase: ChampionatLivePhase;
  matchStatus?: string;
  homeTeamName: string;
  awayTeamName: string;
  loading?: boolean;
  error?: string | null;
};

function teamLabel(
  side: ChampionatMatchEvent["teamSide"],
  homeTeamName: string,
  awayTeamName: string,
): string | null {
  if (side === "home") return homeTeamName;
  if (side === "away") return awayTeamName;
  return null;
}

function EventSideDetails({
  event,
  team,
  align,
}: {
  event: ChampionatMatchEvent;
  team: string | null;
  align: "left" | "right";
}) {
  const typeLabel = CHAMPIONAT_EVENT_LABELS[event.type];

  return (
    <div
      className={cn(
        "flex min-w-0 flex-col gap-0.5",
        align === "right" ? "items-end text-right" : "items-start text-left",
      )}
    >
      <p className="text-[11px] font-medium uppercase tracking-wide text-brand-muted">
        {typeLabel}
      </p>
      <p className="text-sm font-medium leading-snug text-white">
        {event.playerName}
      </p>
      {event.assistName ? (
        <p className="text-xs text-brand-muted">{event.assistName}</p>
      ) : null}
      {team ? (
        <p className="text-[11px] text-brand-muted">{team}</p>
      ) : null}
      {event.score ? (
        <p className="text-xs font-semibold tabular-nums text-brand-lime">
          {event.score.replace(":", " : ")}
        </p>
      ) : null}
    </div>
  );
}

function TimelineMarkerCenter({
  label,
  marker,
}: {
  label: string;
  marker: "start" | "halftime" | "end";
}) {
  return (
    <div className="flex shrink-0 flex-col items-center gap-1 py-0.5">
      <LiveTimelineMarkerIcon marker={marker} />
      <span className="max-w-[5.5rem] text-center text-[11px] font-medium leading-tight text-white">
        {label}
      </span>
    </div>
  );
}

export function LiveMatchEventsList({
  events,
  livePhase,
  matchStatus,
  homeTeamName,
  awayTeamName,
  loading,
  error,
}: LiveMatchEventsListProps) {
  const rows = buildLiveTimelineRows(events, livePhase, matchStatus);

  if (loading && rows.length === 0) {
    return (
      <p className="rounded-xl bg-brand-bg px-3 py-6 text-center text-sm text-brand-muted">
        Загрузка событий…
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

  if (rows.length === 0) {
    return (
      <p className="rounded-xl bg-brand-bg px-3 py-6 text-center text-sm text-brand-muted">
        Пока нет событий в протоколе матча.
      </p>
    );
  }

  return (
    <div className="px-1">
      <ul>
        {rows.map((row, index) => {
          const isFirst = index === 0;
          const isLast = index === rows.length - 1;

          if (row.kind === "marker") {
            return (
              <li
                key={row.id}
                className="grid grid-cols-[minmax(0,1fr)_2.75rem_minmax(0,1fr)] items-stretch gap-x-2 sm:grid-cols-[minmax(0,1fr)_3rem_minmax(0,1fr)] sm:gap-x-3"
              >
                <div aria-hidden />
                <div className="flex h-full flex-col items-center">
                  {!isFirst ? (
                    <div
                      className="w-px min-h-3 flex-1 bg-brand-neutral/50"
                      aria-hidden
                    />
                  ) : null}
                  <TimelineMarkerCenter label={row.label} marker={row.marker} />
                  {!isLast ? (
                    <div
                      className="w-px min-h-3 flex-1 bg-brand-neutral/50"
                      aria-hidden
                    />
                  ) : null}
                </div>
                <div aria-hidden />
              </li>
            );
          }

          const event = row.event;
          const isHome = event.teamSide === "home";
          const isAway = event.teamSide === "away";
          const team = teamLabel(event.teamSide, homeTeamName, awayTeamName);
          const showLeft = isHome || (!isHome && !isAway);
          const showRight = isAway;

          return (
            <li
              key={row.id}
              className="grid grid-cols-[minmax(0,1fr)_2.75rem_minmax(0,1fr)] items-stretch gap-x-2 sm:grid-cols-[minmax(0,1fr)_3rem_minmax(0,1fr)] sm:gap-x-3"
            >
              <div
                className={cn(
                  "flex min-w-0 justify-end py-3",
                  isFirst && "pt-0",
                  isLast && "pb-0",
                )}
              >
                {showLeft ? (
                  <EventSideDetails
                    event={event}
                    team={team}
                    align="right"
                  />
                ) : null}
              </div>

              <div className="flex h-full flex-col items-center">
                {!isFirst ? (
                  <div
                    className="w-px min-h-3 flex-1 bg-brand-neutral/50"
                    aria-hidden
                  />
                ) : null}
                <div className="flex shrink-0 flex-col items-center gap-1 py-0.5">
                  <LiveMatchEventIcon type={event.type} />
                  <span className="text-xs font-semibold tabular-nums leading-none text-brand-muted">
                    {event.minuteLabel}
                  </span>
                </div>
                {!isLast ? (
                  <div
                    className="w-px min-h-3 flex-1 bg-brand-neutral/50"
                    aria-hidden
                  />
                ) : null}
              </div>

              <div
                className={cn(
                  "flex min-w-0 justify-start py-3",
                  isFirst && "pt-0",
                  isLast && "pb-0",
                )}
              >
                {showRight ? (
                  <EventSideDetails
                    event={event}
                    team={team}
                    align="left"
                  />
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
