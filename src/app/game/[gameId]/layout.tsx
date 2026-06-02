import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { getSession } from "@/lib/auth";
import { isSuperadmin } from "@/lib/roles";
import { NoGamesPrompt } from "@/components/game/no-games-prompt";
import { ContentContainer } from "@/components/layout/content-container";
import { prisma } from "@/lib/db";
import {
  assertGameParticipant,
  canManageGame,
  getUserGamesState,
  redirectToCanonicalGameRoute,
  resolveGameIdFromRoute,
} from "@/lib/game-access";

export const dynamic = "force-dynamic";

export default async function GameLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ gameId: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/");

  const { hasGames } = await getUserGamesState(session.id);
  if (!hasGames) {
    return (
      <AppShell user={session}>
        <ContentContainer>
          <NoGamesPrompt />
        </ContentContainer>
      </AppShell>
    );
  }

  const { gameId: routeParam } = await params;
  const internalId = await resolveGameIdFromRoute(routeParam);
  if (!internalId) notFound();

  let game;
  try {
    game = await assertGameParticipant(session, internalId);
  } catch (error) {
    if (error instanceof Error && error.message === "GAME_NOT_FOUND") {
      notFound();
    }
    const inviteGame = await prisma.game.findUnique({
      where: { id: internalId },
      select: { inviteCode: true },
    });
    if (inviteGame) {
      redirect(`/join?invite=${encodeURIComponent(inviteGame.inviteCode)}`);
    }
    redirect("/");
  }

  const headersList = await headers();
  await redirectToCanonicalGameRoute(
    routeParam,
    game.inviteCode,
    headersList.get("x-pathname") ?? "",
  );

  const canManage = await canManageGame(session, game.id);
  return (
    <AppShell
      user={session}
      gameInviteCode={game.inviteCode}
      isPlatformAdmin={isSuperadmin(session.role)}
      canManageGame={canManage}
    >
      {children}
    </AppShell>
  );
}
