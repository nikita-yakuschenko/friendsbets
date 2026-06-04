import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AssignGameOrganizerControl } from "@/components/admin/users/assign-game-organizer-control";
import { DeleteUserButton } from "@/components/admin/users/delete-user-button";
import { GameMembershipList } from "@/components/admin/users/game-membership-list";
import { SendTestEmailButton } from "@/components/admin/users/send-test-email-button";
import { AppShell } from "@/components/layout/app-shell";
import {
  ContentContainer,
  CONTENT_NARROW_MOBILE_LG,
} from "@/components/layout/content-container";
import { UserAvatar } from "@/components/user/user-avatar";
import { UserRoleBadge } from "@/components/user/user-role-badge";
import { Button } from "@/components/ui/button";
import { hasPermission } from "@/lib/roles";
import { cn, formatDateTime } from "@/lib/utils";
import { getSession } from "@/lib/auth";
import { AdminSendTelegramForm } from "@/components/admin/users/admin-send-telegram-form";
import { getAdminUserById } from "@/server/actions/admin";
import { prisma } from "@/lib/db";
import { isTelegramConfigured } from "@/lib/telegram/config";

function AdminUserSection({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className={cn(
        "rounded-xl border border-brand-neutral bg-brand-surface/50 p-4 md:p-5",
        className,
      )}
    >
      {children}
    </section>
  );
}

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

  const telegramConfigured = isTelegramConfigured();

  const games = await prisma.game.findMany({
    orderBy: { createdAt: "desc" },
    select: { id: true, title: true, inviteCode: true },
  });

  return (
    <AppShell user={session} isPlatformAdmin hasGamesOrOversight>
      <ContentContainer className={CONTENT_NARROW_MOBILE_LG}>
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs font-medium uppercase tracking-wide text-brand-muted">
            Пользователь
          </p>
          <Link href="/admin?tab=users" className="shrink-0 self-end sm:self-auto">
            <Button variant="secondary" size="sm">
              ← Пользователи
            </Button>
          </Link>
        </div>

        <div className="grid gap-6 lg:grid-cols-12 lg:items-start">
          <div className="space-y-6 lg:col-span-7">
            <AdminUserSection>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
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
                  <div className="flex flex-wrap items-center gap-2">
                    <UserRoleBadge role={user.platformRole} />
                    <span className="text-xs text-brand-muted tabular-nums">
                      Регистрация: {formatDateTime(new Date(user.createdAt))}
                    </span>
                  </div>
                </div>
              </div>
            </AdminUserSection>

            <AdminUserSection className="space-y-4">
              <h2 className="text-sm font-medium text-white">Турниры</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="mb-2 text-xs text-brand-muted">Организатор</p>
                  <GameMembershipList games={user.organizerGames} variant="organizer" />
                </div>
                <div>
                  <p className="mb-2 text-xs text-brand-muted">Участник</p>
                  <GameMembershipList
                    games={user.participantGames}
                    variant="participant"
                  />
                </div>
              </div>
            </AdminUserSection>
          </div>

          <div className="space-y-6 lg:col-span-5">
            <AdminUserSection>
              <AdminSendTelegramForm
                userId={user.id}
                userName={user.name}
                telegramLinked={user.telegramLinked}
                telegramUsername={user.telegramUsername}
                telegramConfigured={telegramConfigured}
              />
            </AdminUserSection>

            <AdminUserSection className="space-y-3">
              <h2 className="text-sm font-medium text-white">Организатор турнира</h2>
              <AssignGameOrganizerControl
                userId={user.id}
                userName={user.name}
                organizerGameIds={new Set(user.organizerGames.map((g) => g.id))}
                allGames={games}
                className="max-w-none"
              />
            </AdminUserSection>
          </div>
        </div>

        <AdminUserSection className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <SendTestEmailButton userId={user.id} email={user.email} />
            <span className="text-sm text-brand-muted">Тестовое письмо</span>
          </div>
          <DeleteUserButton
            userId={user.id}
            userName={user.name}
            redirectTo="/admin?tab=users"
          />
        </AdminUserSection>
      </ContentContainer>
    </AppShell>
  );
}
