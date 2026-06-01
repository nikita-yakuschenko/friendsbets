import { redirect } from "next/navigation";
import { gamePath } from "@/lib/game-path";
import { resolveGameIdFromRoute } from "@/lib/game-access";
import { prisma } from "@/lib/db";

export default async function FriendsRedirectPage({
  params,
}: {
  params: Promise<{ gameId: string }>;
}) {
  const { gameId: routeParam } = await params;
  const internalId = await resolveGameIdFromRoute(routeParam);
  if (!internalId) {
    redirect("/");
  }

  const game = await prisma.game.findUnique({
    where: { id: internalId },
    select: { inviteCode: true },
  });
  if (!game) {
    redirect("/");
  }

  redirect(gamePath(game.inviteCode, "live"));
}
