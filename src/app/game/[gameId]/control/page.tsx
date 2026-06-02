import { notFound } from "next/navigation";
import { MissingPredictionCard } from "@/components/admin/missing-prediction-card";
import { GameOversightBanner } from "@/components/game/game-oversight-banner";
import { OversightBackLink } from "@/components/game/oversight-back-link";
import { ContentContainer } from "@/components/layout/content-container";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { isPlatformViewQuery } from "@/lib/game-platform-view";
import { requireGameViewByRoute } from "@/lib/game-access";
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
  const view = await requireGameViewByRoute(
    routeParam,
    isPlatformViewQuery(as),
  );
  if (!view?.access.isPlatformOversight) return notFound();

  const game = await prisma.game.findUnique({
    where: { id: view.gameId },
    select: { title: true, inviteCode: true },
  });
  if (!game) return notFound();

  const items = await getAdminMissingPredictions(routeParam);

  return (
    <ContentContainer>
      <PageHeader
        title="Кто не поставил"
        description={`${game.title} · участники без прогноза на ближайшие матчи`}
        action={<OversightBackLink inviteCode={game.inviteCode} />}
      />
      <GameOversightBanner inviteCode={game.inviteCode} />

      {items.length === 0 ? (
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
              match={item.match}
              missingParticipants={item.missingParticipants}
              reminderText={item.reminderText}
            />
          ))}
        </div>
      )}
    </ContentContainer>
  );
}
