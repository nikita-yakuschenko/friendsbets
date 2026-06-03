import { Suspense } from "react";
import { AuthEntry } from "@/components/auth/auth-entry";
import { AuthLayout } from "@/components/layout/auth-layout";
import { getSession } from "@/lib/auth";
import { userNeedsEmailVerification } from "@/lib/email-verification";
import { redirect } from "next/navigation";
import { getActiveGameInviteForUser } from "@/server/actions/active-game";
import { getUserGames } from "@/lib/game-access";
import {
  canDeleteSoloOrganizerTournament,
  canLeaveGameMembership,
  formatGameOrganizersLine,
  getGameOrganizerDisplayNames,
} from "@/lib/game-organizer";
import { AppShell } from "@/components/layout/app-shell";
import { ContentContainer } from "@/components/layout/content-container";
import { PageHeader } from "@/components/layout/page-header";
import { buildRegisterInviteUrl } from "@/lib/game-invite";
import { NoGamesPrompt } from "@/components/game/no-games-prompt";
import { MyTournamentsDataTable } from "@/components/my-tournaments/my-tournaments-data-table";
import { TournamentsAddMenu } from "@/components/my-tournaments/tournaments-add-menu";
import type { MyTournamentRow } from "@/components/my-tournaments/types";

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
  const activeInviteCode = await getActiveGameInviteForUser(
    session.id,
    memberships[0]?.game.inviteCode,
  );
  const multipleTournaments = memberships.length > 1;

  const tournamentRows: MyTournamentRow[] = memberships.map(({ game, role }) => {
    const organizers = formatGameOrganizersLine(getGameOrganizerDisplayNames(game));
    const organizerCount = game.participants.length;
    const participantsCount = game._count.participants;
    const otherTournaments = memberships
      .filter((m) => m.game.id !== game.id)
      .map((m) => ({ inviteCode: m.game.inviteCode, title: m.game.title }));
    return {
      id: game.id,
      title: game.title,
      organizerLabel: organizers.label,
      organizerNames: organizers.text,
      inviteCode: game.inviteCode,
      inviteLinkUrl: buildRegisterInviteUrl(game.inviteCode),
      createdAt: game.createdAt.toISOString(),
      scoringRuleTitle: game.scoringRule.title,
      participantsCount,
      canLeave: canLeaveGameMembership(role, organizerCount, participantsCount),
      canDelete: canDeleteSoloOrganizerTournament(
        role,
        organizerCount,
        participantsCount,
      ),
      isActive: game.inviteCode === activeInviteCode,
      canSetAsActive:
        multipleTournaments && game.inviteCode !== activeInviteCode,
      otherTournaments,
    };
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
