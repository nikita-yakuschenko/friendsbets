import { AdminUsersDataTable } from "@/components/admin/users/users-data-table";
import type { AdminGameOption, AdminUserRow } from "@/components/admin/users/types";

export function AdminUsersPanel({
  users,
  games,
  telegramConfigured,
}: {
  users: AdminUserRow[];
  games: AdminGameOption[];
  telegramConfigured: boolean;
}) {
  return (
    <AdminUsersDataTable
      data={users}
      games={games}
      telegramConfigured={telegramConfigured}
    />
  );
}
