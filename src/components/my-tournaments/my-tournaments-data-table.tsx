"use client";

import { myTournamentsColumns } from "@/components/my-tournaments/columns";
import type { MyTournamentRow } from "@/components/my-tournaments/types";
import { DataTable } from "@/components/ui/data-table";

export function MyTournamentsDataTable({ data }: { data: MyTournamentRow[] }) {
  return (
    <DataTable
      columns={myTournamentsColumns}
      data={data}
      filterColumnId="title"
      filterPlaceholder="Поиск по названию или коду приглашения…"
      emptyMessage="Нет турниров."
      tableClassName="font-ibm-plex font-normal [&_td]:font-normal [&_th]:font-normal"
    />
  );
}
