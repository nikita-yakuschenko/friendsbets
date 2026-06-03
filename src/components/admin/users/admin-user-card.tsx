import { AssignGameOrganizerControl } from "@/components/admin/users/assign-game-organizer-control";
import { GameMembershipList } from "@/components/admin/users/game-membership-list";
import { SendTestEmailButton } from "@/components/admin/users/send-test-email-button";
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
}: {
  user: AdminUserRow;
  games: AdminGameOption[];
}) {
  return (
    <AdminRecordCard>
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-base font-medium leading-snug text-white">{user.name}</p>
          <p className="mt-0.5 truncate text-xs text-brand-muted">{user.email}</p>
        </div>
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
          participantGames={user.participantGames}
          organizerGameIds={new Set(user.organizerGames.map((g) => g.id))}
          allGames={games}
          className="max-w-none w-full"
        />
        <SendTestEmailButton userId={user.id} email={user.email} />
      </AdminCardFooter>
    </AdminRecordCard>
  );
}
