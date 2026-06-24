"use client";

import { useEffect, useState } from "react";
import { LiveMatchEventsList } from "@/components/game/live-match-events-list";
import {
  LiveMatchPredictionsPanel,
  type LiveMatchPredictionsPanelProps,
} from "@/components/game/live-match-predictions-panel";
import type { ChampionatLivePhase } from "@/lib/football-api/championat/match-live-phase";
import type { ChampionatMatchEvent } from "@/lib/football-api/championat/match-protocol-types";
import { cn } from "@/lib/utils";

type LiveMatchTabId = "predictions" | "protocol";

const TABS: { id: LiveMatchTabId; label: string }[] = [
  { id: "predictions", label: "Прогнозы" },
  { id: "protocol", label: "Лайв" },
];

/** Запоминаем выбранный таб между перезагрузками страницы. */
const TAB_STORAGE_KEY = "friendsbets:live-match-tab";

function isLiveMatchTabId(value: string | null): value is LiveMatchTabId {
  return value === "predictions" || value === "protocol";
}

export function LiveMatchCardTabs({
  predictions,
  events,
  eventsLoading,
  eventsError,
  syncWarning,
  livePhase,
  matchStatus,
  homeTeamName,
  awayTeamName,
}: {
  predictions: LiveMatchPredictionsPanelProps;
  events: ChampionatMatchEvent[];
  eventsLoading?: boolean;
  eventsError?: string | null;
  syncWarning?: string | null;
  livePhase: ChampionatLivePhase;
  matchStatus: string;
  homeTeamName: string;
  awayTeamName: string;
}) {
  const [tab, setTab] = useState<LiveMatchTabId>("protocol");

  useEffect(() => {
    const stored = window.localStorage.getItem(TAB_STORAGE_KEY);
    if (!isLiveMatchTabId(stored)) return;
    const id = window.setTimeout(() => setTab(stored), 0);
    return () => window.clearTimeout(id);
  }, []);

  const selectTab = (next: LiveMatchTabId) => {
    setTab(next);
    try {
      window.localStorage.setItem(TAB_STORAGE_KEY, next);
    } catch {
      /* localStorage может быть недоступен (приватный режим) — просто не сохраняем */
    }
  };

  return (
    <div className="mt-4 border-t border-brand-neutral/60 pt-4">
      <nav
        className="mb-4 flex gap-1 rounded-xl border border-brand-neutral bg-brand-bg/80 p-1"
        aria-label="Разделы матча в лайве"
      >
        {TABS.map((item) => {
          const active = item.id === tab;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => selectTab(item.id)}
              className={cn(
                "flex-1 rounded-lg px-3 py-2 text-xs font-medium transition-colors sm:text-sm",
                active
                  ? "bg-brand-lime text-black"
                  : "text-brand-muted hover:text-white",
              )}
            >
              {item.label}
            </button>
          );
        })}
      </nav>

      {tab === "predictions" ? (
        <LiveMatchPredictionsPanel {...predictions} />
      ) : (
        <LiveMatchEventsList
          events={events}
          livePhase={livePhase}
          matchStatus={matchStatus}
          homeTeamName={homeTeamName}
          awayTeamName={awayTeamName}
          loading={eventsLoading}
          error={eventsError}
          syncWarning={syncWarning}
        />
      )}
    </div>
  );
}
