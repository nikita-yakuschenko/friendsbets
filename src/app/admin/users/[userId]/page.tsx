import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AssignGameOrganizerControl } from "@/components/admin/users/assign-game-organizer-control";
import { DeleteUserButton } from "@/components/admin/users/delete-user-button";
import { GameMembershipList } from "@/components/admin/users/game-membership-list";
import { SendTestEmailButton } from "@/components/admin/users/send-test-email-button";
import { AppShell } from "@/components/layout/app-shell";
import { ContentContainer } from "@/components/layout/content-container";
import { UserAvatar } from "@/components/user/user-avatar";
import { UserRoleBadge } from "@/components/user/user-role-badge";
import { Button } from "@/components/ui/button";
import { hasPermission } from "@/lib/roles";
import { formatDateTime } from "@/lib/utils";
import { getSession } from "@/lib/auth";
import { getAdminUserById } from "@/server/actions/admin";
import { prisma } from "@/lib/db";

export default async function AdminUserPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/");
  if (!hasPermission(session.role, "platformAdmin")) redirect("/admin");

  const { userId } = await params;
  const user = await getAdminUserById(userId);
  if (!user) notFound();

  const games = await prisma.game.findMany({
    orderBy: { createdAt: "desc" },
    select: { id: true, title: true, inviteCode: true },
  });

  return (
    <AppShell user={session} isPlatformAdmin hasGamesOrOversight>
      <ContentContainer className="max-w-lg">
        <div className="mb-5 flex items-start justify-end">
          <Link href="/admin?tab=users" className="shrink-0">
            <Button variant="secondary" size="sm">
              ← Пользователи
            </Button>
          </Link>
        </div>

        <div className="space-y-6">
          <div className="flex items-start gap-4">
            <UserAvatar
              name={user.name}
              avatarUrl={user.avatarUrl}
              updatedAt={user.updatedAt}
              size="lg"
            />
            <div className="min-w-0 flex-1 space-y-2">
              <h1 className="brand-display text-2xl leading-tight text-white md:text-3xl">
                {user.name}
              </h1>
              <p className="truncate text-sm text-brand-muted">{user.email}</p>
              <UserRoleBadge role={user.platformRole} />
              <p className="text-xs text-brand-muted tabular-nums">
                Регистрация: {formatDateTime(new Date(user.createdAt))}
              </p>
            </div>
          </div>

          <section className="space-y-2 border-t border-brand-neutral/60 pt-5">
            <h2 className="text-sm font-medium text-white">Турниры</h2>
            <div className="space-y-3 text-sm">
              <div>
                <p className="mb-1 text-xs text-brand-muted">Организатор</p>
                <GameMembershipList games={user.organizerGames} variant="organizer" />
              </div>
              <div>
                <p className="mb-1 text-xs text-brand-muted">Участник</p>
                <GameMembershipList
                  games={user.participantGames}
                  variant="participant"
                />
              </div>
            </div>
          </section>

          <section className="space-y-3 border-t border-brand-neutral/60 pt-5">
            <h2 className="text-sm font-medium text-white">Организатор турнира</h2>
            <AssignGameOrganizerControl
              userId={user.id}
              userName={user.name}
              organizerGameIds={new Set(user.organizerGames.map((g) => g.id))}
              allGames={games}
            />
          </section>

          <section className="flex flex-wrap items-center gap-3 border-t border-brand-neutral/60 pt-5">
            <div className="flex items-center gap-2">
              <SendTestEmailButton userId={user.id} email={user.email} />
              <span className="text-sm text-brand-muted">Тестовое письмо</span>
            </div>
            <DeleteUserButton
              userId={user.id}
              userName={user.name}
              redirectTo="/admin?tab=users"
            />
          </section>
        </div>
      </ContentContainer>
    </AppShell>
  );
}
