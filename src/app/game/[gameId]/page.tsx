import Link from "next/link";
import { notFound } from "next/navigation";
import { MiniLeaderboard } from "@/components/game/mini-leaderboard";
import { LiveMatchHomePreview } from "@/components/game/live-match-home-preview";
import { NextMatchEmpty, NextMatchPreview } from "@/components/game/next-match-preview";
import { StatCard, StatValue } from "@/components/game/stat-card";
import { ContentContainer } from "@/components/layout/content-container";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  canManageGame,
  gamePath,
  resolveGameIdFromRoute,
} from "@/lib/game-access";
import { isPlatformViewQuery } from "@/lib/game-platform-view";
import { parseGameOversightTab } from "@/lib/game-oversight-tabs";
import { getSession } from "@/lib/auth";
import { isSuperadmin } from "@/lib/roles";
import { GameOversightHome } from "@/components/game/game-oversight-home";
import { GameOversightShell } from "@/components/game/game-oversight-shell";
import { PlatformOversightBackButton } from "@/components/game/platform-oversight-back-button";
import {
  getGameOverview,
  getGameOversightOverview,
  getLiveMatches,
} from "@/server/actions/games";

export default async function GamePage({
  params,
  searchParams,
}: {
  params: Promise<{ gameId: string }>;
  searchParams: Promise<{ as?: string; tab?: string }>;
}) {
  const session = await getSession();
  if (!session) return notFound();

  const { gameId: routeParam } = await params;
  const { as, tab: tabParam } = await searchParams;
  const platformView = isPlatformViewQuery(as);

  const oversight = await getGameOversightOverview(routeParam, platformView);
  if (oversight) {
    const activeTab = parseGameOversightTab(tabParam);

    return (
      <ContentContainer>
        <PageHeader
          title={oversight.game.title}
          keepTitleOnDesktop
          action={<PlatformOversightBackButton />}
        />
        <GameOversightShell
          inviteCode={oversight.game.inviteCode}
          activeTab={activeTab}
          platformTabLinks={oversight.usePlatformTabLinks}
          bannerVariant={
            oversight.isPlatformOversight ? "platform" : "organizer"
          }
        >
          <GameOversightHome
            data={oversight}
            activeTab={activeTab}
            canRenameGameTitle={isSuperadmin(session.role)}
          />
        </GameOversightShell>
      </ContentContainer>
    );
  }

  const gameId = await resolveGameIdFromRoute(routeParam);
  const [overview, liveNow, canManage] = await Promise.all([
    getGameOverview(routeParam, session.id),
    getLiveMatches(routeParam),
    gameId ? canManageGame(session, gameId) : Promise.resolve(false),
  ]);
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

      <div className="mb-4">
        {liveNow.length > 0 ? (
          <LiveMatchHomePreview
            matchId={liveNow[0]!.match.id}
            match={liveNow[0]!.match}
            hasPrediction={Boolean(liveNow[0]!.myPrediction)}
            prediction={
              liveNow[0]!.myPrediction
                ? {
                    homeScore: liveNow[0]!.myPrediction.homeScore,
                    awayScore: liveNow[0]!.myPrediction.awayScore,
                  }
                : null
            }
            predictionsHref={gamePath(game.inviteCode, "predictions")}
          />
        ) : nextMatch ? (
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
          <div
            className={`grid grid-cols-1 gap-2 sm:grid-cols-2 ${canManage ? "lg:grid-cols-4" : "sm:grid-cols-3"}`}
          >
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
            {canManage ? (
              <Link href={gamePath(game.inviteCode, "control")}>
                <Button variant="secondary" className="w-full">
                  Кто не поставил
                </Button>
              </Link>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </ContentContainer>
  );
}
