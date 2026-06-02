import Link from "next/link";
import { notFound } from "next/navigation";
import { MiniLeaderboard } from "@/components/game/mini-leaderboard";
import { NextMatchEmpty, NextMatchPreview } from "@/components/game/next-match-preview";
import { StatCard, StatValue } from "@/components/game/stat-card";
import { ContentContainer } from "@/components/layout/content-container";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { gamePath, isGameParticipant, resolveGameIdFromRoute } from "@/lib/game-access";
import { isPlatformViewQuery } from "@/lib/game-platform-view";
import { getSession } from "@/lib/auth";
import { isSuperadmin } from "@/lib/roles";
import { GameOversightHome } from "@/components/game/game-oversight-home";
import { GamePlayerModeBanner } from "@/components/game/game-player-mode-banner";
import { getGameOverview, getGameOversightOverview } from "@/server/actions/games";

export default async function GamePage({
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
  const platformView = isPlatformViewQuery(as);

  const oversight = await getGameOversightOverview(routeParam, platformView);
  if (oversight) {
    const internalId = await resolveGameIdFromRoute(routeParam);
    const alsoParticipant =
      internalId && (await isGameParticipant(session.id, internalId));

    return (
      <ContentContainer>
        <PageHeader title={oversight.game.title} keepTitleOnDesktop />
        <GameOversightHome
          data={oversight}
          isAlsoParticipant={Boolean(alsoParticipant)}
        />
      </ContentContainer>
    );
  }

  const overview = await getGameOverview(routeParam, session.id);
  if (!overview) return notFound();

  const {
    game,
    myRank,
    myRow,
    leader,
    isLeader,
    nextMatch,
    nextMatchHasPrediction,
    nextMatchPrediction,
    missingPredictionsCount,
    topLeaderboard,
  } = overview;

  return (
    <ContentContainer>
      <PageHeader
        title={game.title}
        keepTitleOnDesktop
        description={
          [
            game.tournament.title,
            game.entryFeeText ? `Взнос: ${game.entryFeeText}` : null,
          ]
            .filter(Boolean)
            .join(" · ")
        }
      />

      {isSuperadmin(session.role) ? (
        <GamePlayerModeBanner inviteCode={game.inviteCode} />
      ) : null}

      <div className="mb-4">
        {nextMatch ? (
          <NextMatchPreview
            match={nextMatch}
            hasPrediction={nextMatchHasPrediction}
            prediction={nextMatchPrediction}
            predictionsHref={gamePath(game.inviteCode, "predictions")}
          />
        ) : (
          <NextMatchEmpty />
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2 md:items-stretch">
        <StatCard label="Моё место">
          <p className="text-4xl text-brand-lime">
            <StatValue>{myRank ?? "—"}</StatValue>
            {myRow && myRank !== null && (
              <span className="ml-2 text-2xl text-brand-muted">
                (
                <StatValue className="text-brand-muted">
                  {myRow.totalPoints} очков
                </StatValue>
                )
              </span>
            )}
          </p>
          {leader && !isLeader && (
            <p className="mt-3 text-sm text-brand-muted">
              Лидер:{" "}
              <span className="text-white">{leader.displayName}</span>
              {" · "}
              {leader.totalPoints} очк.
            </p>
          )}
          {leader && isLeader && myRank === 1 && (
            <p className="mt-3 text-sm text-brand-lime">Вы лидируете</p>
          )}
        </StatCard>

        <Card className="min-h-leaderboard flex h-full flex-col overflow-hidden p-0">
          <MiniLeaderboard
            fill
            rows={topLeaderboard}
            currentUserId={session.id}
            detailsHref={gamePath(game.inviteCode, "leaderboard")}
          />
        </Card>
      </div>

      <Card className="mt-4 hidden md:block">
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Badge variant={missingPredictionsCount > 0 ? "warning" : "default"}>
              {missingPredictionsCount > 0
                ? `Не сделано прогнозов: ${missingPredictionsCount}`
                : "Все ближайшие прогнозы сделаны"}
            </Badge>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <Link href={gamePath(game.inviteCode, "predictions")}>
              <Button className="w-full">Сделать прогноз</Button>
            </Link>
            <Link href={gamePath(game.inviteCode, "leaderboard")}>
              <Button variant="secondary" className="w-full">
                Таблица
              </Button>
            </Link>
            <Link href={gamePath(game.inviteCode, "live")}>
              <Button variant="secondary" className="w-full">
                Лайв
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </ContentContainer>
  );
}
