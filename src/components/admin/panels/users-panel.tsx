import { AdminUsersDataTable } from "@/components/admin/users/users-data-table";
import { EmailDeliveryStatus } from "@/components/admin/users/email-delivery-status";
import type { AdminUserRow } from "@/components/admin/users/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getEmailDeliveryMode } from "@/lib/email";

export function AdminUsersPanel({ users }: { users: AdminUserRow[] }) {
  const emailMode = getEmailDeliveryMode();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Пользователи платформы</CardTitle>
        <p className="text-sm text-brand-muted">
          «Организатор» / «Участник» — роли пользователя в турнирах. Клик по
          названию открывает <span className="text-white">просмотр платформы</span>
          : состав, контроль прогнозов, таблица — без вступления в турнир.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <EmailDeliveryStatus mode={emailMode} />
        <AdminUsersDataTable data={users} />
      </CardContent>
    </Card>
  );
}
