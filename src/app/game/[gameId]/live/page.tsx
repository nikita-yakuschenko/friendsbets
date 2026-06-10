import { notFound, redirect } from "next/navigation";
import { GameOversightBanner } from "@/components/game/game-oversight-banner";
import { LiveMatchCard } from "@/components/game/live-match-card";
import { LiveMatchPickerList } from "@/components/game/live-match-picker-list";
import { NextMatchEmpty, NextMatchPreview } from "@/components/game/next-match-preview";
import { PlatformOversightBackButton } from "@/components/game/platform-oversight-back-button";
import { ContentContainer } from "@/components/layout/content-container";
import { PageHeader } from "@/components/layout/page-header";
import { gamePath } from "@/lib/game-path";
import { getSession } from "@/lib/auth";
import { isPlatformViewQuery } from "@/lib/game-platform-view";
import { requireGameViewByRoute } from "@/lib/game-access";
import { getGameOverview, getLiveMatches } from "@/server/actions/games";

export const revalidate = 30;

export default async function LivePage({
  params,
  searchParams,
}: {
  params: Promise<{ gameId: string }>;
  searchParams: Promise<{ as?: string }>;
}) {
  const session = await getSession();
  if (!session) return notFound();

  const { gameId } = await params;
  const { as } = await searchParams;
  const view = await requireGameViewByRoute(gameId, isPlatformViewQuery(as));
  if (!view) return notFound();

  const oversight = view.access.isPlatformOversight;
  const items = await getLiveMatches(gameId);
  const inviteCode = view.access.game.inviteCode;

  if (items.length === 1) {
    redirect(gamePath(inviteCode, `live/${items[0]!.match.id}`));
  }

  if (oversight) {
    return (
      <ContentContainer>
        <PageHeader
          title={view.access.game.title}
          keepTitleOnDesktop
          action={<PlatformOversightBackButton />}
        />
        <GameOversightBanner />
        {items.length > 1 ? (
          <LiveMatchPickerList inviteCode={inviteCode} items={items} />
        ) : null}
      </ContentContainer>
    );
  }

  const overview = await getGameOverview(gameId, session.id);
  if (!overview) return notFound();

  const {
    game,
    nextMatch,
    nextMatchHasPrediction,
    nextMatchPrediction,
  } = overview;

  return (
    <ContentContainer>
      <PageHeader title="Лайв" />

      {items.length > 1 ? (
        <LiveMatchPickerList inviteCode={game.inviteCode} items={items} />
      ) : (
        <div className="mb-4">
          {nextMatch ? (
            <NextMatchPreview
              match={nextMatch}
              hasPrediction={nextMatchHasPrediction}
              prediction={nextMatchPrediction}
              predictionsHref={gamePath(game.inviteCode, "predictions")}
              showCountdown
            />
          ) : (
            <NextMatchEmpty />
          )}
        </div>
      )}
    </ContentContainer>
  );
}
