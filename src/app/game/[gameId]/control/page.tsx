import { notFound } from "next/navigation";

import { MissingPredictionCard } from "@/components/admin/missing-prediction-card";
import { GameOversightShell } from "@/components/game/game-oversight-shell";
import { TournamentManageBackButton } from "@/components/game/tournament-manage-back-button";
import { ContentContainer } from "@/components/layout/content-container";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { isPlatformViewQuery } from "@/lib/game-platform-view";
import { requireTournamentManagementByRoute } from "@/lib/game-access";
import { getAdminMissingPredictions } from "@/server/actions/admin";

export default async function GameControlPage({
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

  const items = await getAdminMissingPredictions(routeParam);

  const missingBody =
    items.length === 0 ? (
      <Card>
        <CardContent className="py-8 text-center text-brand-muted">
          Нет предстоящих матчей или все участники уже сделали прогнозы.
        </CardContent>
      </Card>
    ) : (
      <div className="space-y-4">
        {items.map((item) => (
          <MissingPredictionCard
            key={item.match.id}
            routeParam={routeParam}
            inviteCode={game.inviteCode}
            match={item.match}
            missingParticipants={item.missingParticipants}
            reminderText={item.reminderText}
          />
        ))}
      </div>
    );

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
        activeTab="missing"
        platformTabLinks={management.usePlatformTabLinks}
        bannerVariant={
          management.isPlatformOversight ? "platform" : "organizer"
        }
      >
        {missingBody}
      </GameOversightShell>
    </ContentContainer>
  );
}
