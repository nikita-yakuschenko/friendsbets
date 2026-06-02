"use client";

import { adminUsersColumns } from "@/components/admin/users/columns";
import type { AdminUserRow } from "@/components/admin/users/types";
import { DataTable } from "@/components/ui/data-table";

export function AdminUsersDataTable({ data }: { data: AdminUserRow[] }) {
  return (
    <DataTable
      columns={adminUsersColumns}
      data={data}
      filterColumnId="name"
      filterPlaceholder="Поиск по имени или email…"
      emptyMessage="Нет пользователей."
      tableClassName="font-ibm-plex font-normal [&_td]:font-normal [&_th]:font-normal"
    />
  );
}
