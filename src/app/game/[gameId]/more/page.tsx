import Link from "next/link";
import { notFound } from "next/navigation";
import { ContentContainer } from "@/components/layout/content-container";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { canManageGame, resolveGameIdFromRoute } from "@/lib/game-access";
import { getSession } from "@/lib/auth";
import { isAdmin } from "@/lib/roles";
import { prisma } from "@/lib/db";

export default async function GameMorePage({
  params,
}: {
  params: Promise<{ gameId: string }>;
}) {
  const session = await getSession();
  if (!session) return notFound();

  const { gameId: routeParam } = await params;
  const internalId = await resolveGameIdFromRoute(routeParam);
  if (!internalId) return notFound();

  const game = await prisma.game.findUnique({
    where: { id: internalId },
    select: { inviteCode: true },
  });
  if (!game) return notFound();

  const canManage = await canManageGame(session, internalId);
  const isPlatformAdmin = isAdmin(session.role);

  return (
    <ContentContainer>
      <PageHeader title="Ещё" description="Дополнительные разделы игры." />

      <div className="space-y-3">
        <Link href="/">
          <Button variant="secondary" className="w-full justify-start">
            Мои турниры
          </Button>
        </Link>
        {canManage && (
          <Link href={`/admin/missing?game=${encodeURIComponent(game.inviteCode)}`}>
            <Button variant="secondary" className="w-full justify-start">
              Кто не поставил
            </Button>
          </Link>
        )}
        {isPlatformAdmin && (
          <Link href="/admin">
            <Button variant="secondary" className="w-full justify-start">
              Админка платформы
            </Button>
          </Link>
        )}
      </div>
    </ContentContainer>
  );
}
