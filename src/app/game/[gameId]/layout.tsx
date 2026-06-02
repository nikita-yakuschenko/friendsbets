import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { GameViewProvider } from "@/components/game/game-view-context";
import { getSession } from "@/lib/auth";
import { isSuperadmin } from "@/lib/roles";
import { NoGamesPrompt } from "@/components/game/no-games-prompt";
import { ContentContainer } from "@/components/layout/content-container";
import { isPlatformViewQuery } from "@/lib/game-platform-view";
import {
  canManageGame,
  getUserGamesState,
  redirectToCanonicalGameRoute,
  resolveGameIdFromRoute,
  resolveGameViewAccess,
} from "@/lib/game-access";

export const dynamic = "force-dynamic";

export default async function GameLayout({
  children,
  params,
  searchParams,
}: {
  children: React.ReactNode;
  params: Promise<{ gameId: string }>;
  searchParams?: Promise<{ as?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/");

  const isPlatformSuperadmin = isSuperadmin(session.role);
  const { hasGames } = await getUserGamesState(session.id);

  if (!hasGames && !isPlatformSuperadmin) {
    return (
      <AppShell user={session}>
        <ContentContainer>
          <NoGamesPrompt />
        </ContentContainer>
      </AppShell>
    );
  }

  const { gameId: routeParam } = await params;
  const { as } = (await searchParams) ?? {};
  const platformView = isPlatformViewQuery(as);

  const internalId = await resolveGameIdFromRoute(routeParam);
  if (!internalId) notFound();

  const access = await resolveGameViewAccess(session, internalId, {
    platformView,
  });

  if (access.status === "not_found") {
    notFound();
  }

  if (access.status === "need_join") {
    redirect(`/join?invite=${encodeURIComponent(access.game.inviteCode)}`);
  }

  const { game, canPredict, isPlatformOversight } = access;

  const headersList = await headers();
  await redirectToCanonicalGameRoute(
    routeParam,
    game.inviteCode,
    headersList.get("x-pathname") ?? "",
  );

  const canManage = await canManageGame(session, game.id);

  return (
    <GameViewProvider
      value={{
        inviteCode: game.inviteCode,
        canPredict,
        isPlatformOversight,
      }}
    >
      <AppShell
        user={session}
        gameInviteCode={game.inviteCode}
        isPlatformAdmin={isPlatformSuperadmin}
        canManageGame={canManage}
        gameOversightMode={isPlatformOversight}
        hasGamesOrOversight={hasGames || isPlatformOversight}
      >
        {children}
      </AppShell>
    </GameViewProvider>
  );
}
