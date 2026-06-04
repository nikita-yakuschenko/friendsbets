import { Suspense } from "react";
import { AuthEntry } from "@/components/auth/auth-entry";
import { AuthLayout } from "@/components/layout/auth-layout";
import { getSession } from "@/lib/auth";
import { userNeedsEmailVerification } from "@/lib/email-verification";
import { redirect } from "next/navigation";
import { getActiveGameInviteForUser } from "@/server/actions/active-game";
import { getUserGames } from "@/lib/game-access";
import { buildMyTournamentRows } from "@/lib/my-tournaments-rows";
import { AppShell } from "@/components/layout/app-shell";
import { ContentContainer } from "@/components/layout/content-container";
import { PageHeader } from "@/components/layout/page-header";
import { buildTournamentSourceLabelMap } from "@/lib/tournament-source-label";
import { NoGamesPrompt } from "@/components/game/no-games-prompt";
import { PlatformAdminHomePrompt } from "@/components/game/platform-admin-home-prompt";
import { isSuperadmin } from "@/lib/roles";
import { MyTournamentsDataTable } from "@/components/my-tournaments/my-tournaments-data-table";
import { TournamentsAddMenu } from "@/components/my-tournaments/tournaments-add-menu";
import { normalizeInviteCodeInput } from "@/lib/invite-code";
import { getGameTournamentStartedMap } from "@/lib/game-tournament-started";
import { prisma } from "@/lib/db";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ register?: string; invite?: string }>;
}) {
  const { invite } = await searchParams;
  const session = await getSession();

  if (session && userNeedsEmailVerification(session)) {
    redirect("/verify-email");
  }

  if (session && invite?.trim()) {
    redirect(
      `/join?invite=${encodeURIComponent(normalizeInviteCodeInput(invite))}`,
    );
  }

  if (!session) {
    return (
      <AuthLayout
        title="Закрытый турнир прогнозов для друзей"
        titleLines={["Закрытый турнир", "прогнозов для друзей"]}
        landingBackground
      >
        <Suspense fallback={<div className="h-64 animate-pulse rounded-xl bg-brand-bg" />}>
          <AuthEntry />
        </Suspense>
      </AuthLayout>
    );
  }

  const memberships = await getUserGames(session.id);
  const gameIds = memberships.map((m) => m.game.id);
  const [activeInviteCode, sourceLabelByExternalId, tournamentStartedByGameId, scoringRules] =
    await Promise.all([
      getActiveGameInviteForUser(session.id, memberships[0]?.game.inviteCode),
      buildTournamentSourceLabelMap(
        memberships.map((m) => m.game.tournament.externalId),
      ),
      getGameTournamentStartedMap(gameIds),
      prisma.scoringRule.findMany({
        orderBy: { title: "asc" },
        select: { id: true, title: true, code: true },
      }),
    ]);

  const tournamentRows = buildMyTournamentRows({
    memberships,
    activeInviteCode: activeInviteCode ?? null,
    sourceLabelByExternalId,
    tournamentStartedByGameId,
  });

  const isPlatformSuperadmin = isSuperadmin(session.role);

  return (
    <AppShell user={session}>
      <ContentContainer>
        <PageHeader
          title="Мои турниры"
          description={
            isPlatformSuperadmin && memberships.length === 0
              ? "Турниры участников и управление платформой."
              : "Выберите турнир, создайте новый или подключитесь по invite-коду."
          }
          action={memberships.length > 0 ? <TournamentsAddMenu /> : undefined}
        />

        {memberships.length === 0 ? (
          isPlatformSuperadmin ? (
            <PlatformAdminHomePrompt />
          ) : (
            <NoGamesPrompt />
          )
        ) : (
          <MyTournamentsDataTable
            data={tournamentRows}
            scoringRules={scoringRules}
          />
        )}
      </ContentContainer>
    </AppShell>
  );
}
