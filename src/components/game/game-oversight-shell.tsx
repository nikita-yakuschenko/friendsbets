import { GameOversightBanner } from "@/components/game/game-oversight-banner";
import { GameOversightTabNav } from "@/components/game/game-oversight-tab-nav";
import type { GameOversightTabId } from "@/lib/game-oversight-tabs";

export function GameOversightShell({
  inviteCode,
  activeTab,
  platformTabLinks = false,
  bannerVariant = "organizer",
  children,
}: {
  inviteCode: string;
  activeTab: GameOversightTabId;
  /** false — организатор турнира (обычные URL без ?as=platform). */
  platformTabLinks?: boolean;
  bannerVariant?: "platform" | "organizer";
  children: React.ReactNode;
}) {
  return (
    <>
      <GameOversightBanner variant={bannerVariant} />
      <GameOversightTabNav
        inviteCode={inviteCode}
        activeTab={activeTab}
        platformTabLinks={platformTabLinks}
      />
      <div className="min-w-0">{children}</div>
    </>
  );
}
