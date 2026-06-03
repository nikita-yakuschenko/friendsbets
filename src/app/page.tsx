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
import { MyTournamentsDataTable } from "@/components/my-tournaments/my-tournaments-data-table";
import { TournamentsAddMenu } from "@/components/my-tournaments/tournaments-add-menu";

export default async function HomePage() {
  const session = await getSession();

  if (session && userNeedsEmailVerification(session)) {
    redirect("/verify-email");
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
  const [activeInviteCode, sourceLabelByExternalId] = await Promise.all([
    getActiveGameInviteForUser(session.id, memberships[0]?.game.inviteCode),
    buildTournamentSourceLabelMap(
      memberships.map((m) => m.game.tournament.externalId),
    ),
  ]);

  const tournamentRows = buildMyTournamentRows({
    memberships,
    activeInviteCode: activeInviteCode ?? null,
    sourceLabelByExternalId,
  });

  return (
    <AppShell user={session}>
      <ContentContainer>
        <PageHeader
          title="Мои турниры"
          description="Выберите турнир, создайте новый или подключитесь по invite-коду."
          action={memberships.length > 0 ? <TournamentsAddMenu /> : undefined}
        />

        {memberships.length === 0 ? (
          <NoGamesPrompt />
        ) : (
          <MyTournamentsDataTable data={tournamentRows} />
        )}
      </ContentContainer>
    </AppShell>
  );
}
