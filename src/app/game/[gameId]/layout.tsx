import { notFound, redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { getSession } from "@/lib/auth";
import { isAdmin } from "@/lib/roles";
import { assertGameParticipant, canManageGame, resolveGameIdFromRoute } from "@/lib/game-access";

export default async function GameLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ gameId: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/");

  const { gameId: routeParam } = await params;
  const internalId = await resolveGameIdFromRoute(routeParam);
  if (!internalId) notFound();

  try {
    const game = await assertGameParticipant(session, internalId);
    const canManage = await canManageGame(session, game.id);
    return (
      <AppShell
        user={session}
        gameSlug={game.slug}
        isPlatformAdmin={isAdmin(session.role)}
        canManageGame={canManage}
      >
        {children}
      </AppShell>
    );
  } catch {
    notFound();
  }
}
