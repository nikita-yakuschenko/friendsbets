import { AdminUsersDataTable } from "@/components/admin/users/users-data-table";
import type { AdminGameOption, AdminUserRow } from "@/components/admin/users/types";

export function AdminUsersPanel({
  users,
  games,
}: {
  users: AdminUserRow[];
  games: AdminGameOption[];
}) {
  return <AdminUsersDataTable data={users} games={games} />;
}
