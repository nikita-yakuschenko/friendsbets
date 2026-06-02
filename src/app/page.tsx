import { Suspense } from "react";
import { AuthEntry } from "@/components/auth/auth-entry";
import { AuthLayout } from "@/components/layout/auth-layout";
import { getSession } from "@/lib/auth";
import { GameParticipantRole } from "@/generated/prisma/client";
import { getUserGames } from "@/lib/game-access";
import { AppShell } from "@/components/layout/app-shell";
import { ContentContainer } from "@/components/layout/content-container";
import { PageHeader } from "@/components/layout/page-header";
import Link from "next/link";
import { buildRegisterInviteUrl } from "@/lib/game-invite";
import { Button } from "@/components/ui/button";
import { NoGamesPrompt } from "@/components/game/no-games-prompt";
import { MyTournamentsDataTable } from "@/components/my-tournaments/my-tournaments-data-table";
import type { MyTournamentRow } from "@/components/my-tournaments/types";
import { Card, CardContent } from "@/components/ui/card";

export default async function HomePage() {
  const session = await getSession();

  if (!session) {
    return (
      <AuthLayout
        title="Закрытый турнир прогнозов для друзей"
        subtitle="Регистрация, турнир по Championat или вход к друзьям по invite-коду."
      >
        <Suspense fallback={<div className="h-64 animate-pulse rounded-xl bg-brand-bg" />}>
          <AuthEntry />
        </Suspense>
      </AuthLayout>
    );
  }

  const memberships = await getUserGames(session.id);

  const tournamentRows: MyTournamentRow[] = memberships.map(({ game, role }) => ({
    id: game.id,
    title: game.title,
    inviteCode: game.inviteCode,
    inviteLinkUrl: buildRegisterInviteUrl(game.inviteCode),
    createdAt: game.createdAt.toISOString(),
    scoringRuleTitle: game.scoringRule.title,
    participantsCount: game._count.participants,
    canLeave: role !== GameParticipantRole.ORGANIZER,
  }));

  return (
    <AppShell user={session} gameInviteCode={memberships[0]?.game.inviteCode}>
      <ContentContainer>
        <PageHeader
          title="Мои турниры"
          description="Выберите турнир, создайте новый или подключитесь по invite-коду."
        />

        {memberships.length > 0 && (
          <div className="mb-6 flex flex-wrap gap-2">
            <Link href="/create">
              <Button size="sm">Создать турнир</Button>
            </Link>
            <Link href="/join">
              <Button size="sm" variant="secondary">
                Найти турнир
              </Button>
            </Link>
          </div>
        )}

        {memberships.length === 0 ? (
          <NoGamesPrompt />
        ) : (
          <Card>
            <CardContent className="pt-6">
              <MyTournamentsDataTable data={tournamentRows} />
            </CardContent>
          </Card>
        )}
      </ContentContainer>
    </AppShell>
  );
}
