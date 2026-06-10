import { notFound } from "next/navigation";
import { ChampionBetSettingsPanel } from "@/components/game/champion-bet-settings-panel";
import { GameOversightShell } from "@/components/game/game-oversight-shell";
import { TournamentManageBackButton } from "@/components/game/tournament-manage-back-button";
import { ContentContainer } from "@/components/layout/content-container";
import { PageHeader } from "@/components/layout/page-header";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { isPlatformViewQuery } from "@/lib/game-platform-view";
import { requireTournamentManagementByRoute } from "@/lib/game-access";
import { getChampionBetOrganizerData } from "@/server/actions/champion-bet";

export default async function GameChampionBetPage({
  params,
  searchParams,
}: {
  params: Promise<{ gameId: string }>;
  searchParams: Promise<{ as?: string }>;
}) {
  const session = await getSession();
  if (!session) return notFound();

  const { gameId: routeParam } = await params;
  const { as } = await searchParams;
  const management = await requireTournamentManagementByRoute(
    routeParam,
    isPlatformViewQuery(as),
  );
  if (!management) return notFound();

  const game = await prisma.game.findUnique({
    where: { id: management.gameId },
    select: { title: true, inviteCode: true },
  });
  if (!game) return notFound();

  const data = await getChampionBetOrganizerData(routeParam);
  if (!data) return notFound();

  return (
    <ContentContainer>
      <PageHeader
        title={game.title}
        keepTitleOnDesktop
        action={
          <TournamentManageBackButton
            inviteCode={game.inviteCode}
            platformOversight={management.isPlatformOversight}
          />
        }
      />

      <GameOversightShell
        inviteCode={game.inviteCode}
        activeTab="champion-bet"
        platformTabLinks={management.usePlatformTabLinks}
        bannerVariant={
          management.isPlatformOversight ? "platform" : "organizer"
        }
      >
        <ChampionBetSettingsPanel
          gameId={data.game.id}
          enabled={data.game.championBetEnabled}
          points={data.game.championBetPoints}
          playoffStarted={data.playoffStarted}
          firstPlayoffStart={data.firstPlayoffStart}
          missingParticipants={data.missingParticipants}
          picks={data.picks}
        />
      </GameOversightShell>
    </ContentContainer>
  );
}
