import { GameOversightBanner } from "@/components/game/game-oversight-banner";
import { GameOversightTabNav } from "@/components/game/game-oversight-tab-nav";
import type { GameOversightTabId } from "@/lib/game-oversight-tabs";

export function GameOversightShell({
  inviteCode,
  activeTab,
  children,
}: {
  inviteCode: string;
  activeTab: GameOversightTabId;
  children: React.ReactNode;
}) {
  return (
    <>
      <GameOversightBanner />
      <GameOversightTabNav inviteCode={inviteCode} activeTab={activeTab} />
      <div className="min-w-0">{children}</div>
    </>
  );
}
