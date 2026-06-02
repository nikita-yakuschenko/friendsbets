import { AdminUsersDataTable } from "@/components/admin/users/users-data-table";
import type { AdminUserRow } from "@/components/admin/users/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function AdminUsersPanel({ users }: { users: AdminUserRow[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Пользователи платформы</CardTitle>
        <p className="text-sm text-brand-muted">
          Где человек создал или ведёт турнир — колонка «Организатор». Где вступил
          только как игрок — «Участник».
        </p>
      </CardHeader>
      <CardContent>
        <AdminUsersDataTable data={users} />
      </CardContent>
    </Card>
  );
}
