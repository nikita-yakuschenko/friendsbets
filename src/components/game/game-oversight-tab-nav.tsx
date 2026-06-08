import Link from "next/link";
import {
  GAME_OVERSIGHT_TABS,
  type GameOversightTabId,
  gameOversightTabHref,
} from "@/lib/game-oversight-tabs";
import { cn } from "@/lib/utils";

export function GameOversightTabNav({
  inviteCode,
  activeTab,
  platformTabLinks = true,
}: {
  inviteCode: string;
  activeTab: GameOversightTabId;
  platformTabLinks?: boolean;
}) {
  return (
    <nav
      className="mb-4 inline-flex max-w-full flex-wrap gap-1 overflow-x-auto rounded-xl border border-brand-neutral bg-brand-surface/50 p-1"
      aria-label="Разделы просмотра турнира"
    >
      {GAME_OVERSIGHT_TABS.map((tab) => {
        const active = tab.id === activeTab;
        return (
          <Link
            key={tab.id}
            href={gameOversightTabHref(inviteCode, tab.id, platformTabLinks)}
            className={cn(
              "shrink-0 whitespace-nowrap rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors sm:px-3 sm:py-2 sm:text-sm",
              active
                ? "bg-brand-lime text-black"
                : "text-brand-muted hover:bg-brand-neutral/30 hover:text-white",
            )}
            aria-current={active ? "page" : undefined}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
