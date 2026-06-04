import Link from "next/link";
import { AssignGameOrganizerControl } from "@/components/admin/users/assign-game-organizer-control";
import { DeleteUserButton } from "@/components/admin/users/delete-user-button";
import { GameMembershipList } from "@/components/admin/users/game-membership-list";
import { AdminSendTelegramForm } from "@/components/admin/users/admin-send-telegram-form";
import { SendTestEmailButton } from "@/components/admin/users/send-test-email-button";
import { UserAvatar } from "@/components/user/user-avatar";
import type { AdminGameOption, AdminUserRow } from "@/components/admin/users/types";
import {
  AdminCardDetails,
  AdminCardFooter,
  AdminDetailRow,
  AdminRecordCard,
} from "@/components/admin/admin-detail-row";
import { UserRoleBadge } from "@/components/user/user-role-badge";
import { formatDateTime } from "@/lib/utils";

export function AdminUserCard({
  user,
  games,
  telegramConfigured,
}: {
  user: AdminUserRow;
  games: AdminGameOption[];
  telegramConfigured: boolean;
}) {
  return (
    <AdminRecordCard>
      <header className="flex items-start justify-between gap-3">
        <Link
          href={`/admin/users/${user.id}`}
          className="flex min-w-0 flex-1 items-center gap-2.5"
        >
          <UserAvatar
            name={user.name}
            avatarUrl={user.avatarUrl}
            updatedAt={user.updatedAt}
            size="md"
          />
          <div className="min-w-0">
            <p className="text-base font-medium leading-snug text-white">{user.name}</p>
            <p className="mt-0.5 truncate text-xs text-brand-muted">{user.email}</p>
          </div>
        </Link>
        <UserRoleBadge role={user.platformRole} />
      </header>

      <AdminCardDetails>
        <AdminDetailRow label="Организатор">
          <GameMembershipList games={user.organizerGames} variant="organizer" />
        </AdminDetailRow>
        <AdminDetailRow label="Участник">
          <GameMembershipList games={user.participantGames} variant="participant" />
        </AdminDetailRow>
        <AdminDetailRow label="Регистрация">
          <span className="text-brand-muted tabular-nums">
            {formatDateTime(new Date(user.createdAt))}
          </span>
        </AdminDetailRow>
      </AdminCardDetails>

      <AdminCardFooter stack>
        <AssignGameOrganizerControl
          userId={user.id}
          userName={user.name}
          organizerGameIds={new Set(user.organizerGames.map((g) => g.id))}
          allGames={games}
          className="max-w-none w-full"
        />
        <div className="flex items-center gap-1">
          <SendTestEmailButton userId={user.id} email={user.email} />
          <DeleteUserButton userId={user.id} userName={user.name} />
        </div>
        <AdminSendTelegramForm
          userId={user.id}
          userName={user.name}
          telegramLinked={user.telegramLinked}
          telegramUsername={user.telegramUsername}
          telegramConfigured={telegramConfigured}
          compact
        />
      </AdminCardFooter>
    </AdminRecordCard>
  );
}
