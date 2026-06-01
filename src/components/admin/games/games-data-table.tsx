"use client";

import { adminGamesColumns } from "@/components/admin/games/columns";
import type { AdminGameRow } from "@/components/admin/games/types";
import { DataTable } from "@/components/ui/data-table";

export function AdminGamesDataTable({ data }: { data: AdminGameRow[] }) {
  return (
    <DataTable
      columns={adminGamesColumns}
      data={data}
      filterColumnId="title"
      filterPlaceholder="Поиск по названию или коду приглашения…"
      emptyMessage="Нет игр."
      tableClassName="font-ibm-plex font-normal [&_td]:font-normal [&_th]:font-normal"
    />
  );
}
