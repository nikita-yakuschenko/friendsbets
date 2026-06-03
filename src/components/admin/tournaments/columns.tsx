"use client";

import { type ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import type {
  AdminTemplateRow,
  AdminTournamentRow,
} from "@/components/admin/tournaments/types";

export const adminTournamentColumns: ColumnDef<AdminTournamentRow>[] = [
  {
    accessorKey: "title",
    header: "Название",
    cell: ({ row }) => (
      <span className="font-medium text-white">{row.original.title}</span>
    ),
  },
  {
    accessorKey: "status",
    header: "Статус",
    cell: ({ row }) => (
      <Badge variant="secondary">{row.getValue("status") as string}</Badge>
    ),
  },
  {
    accessorKey: "externalId",
    header: "External ID",
    cell: ({ row }) => (
      <span className="font-mono text-xs text-brand-muted">
        {row.original.externalId ?? "—"}
      </span>
    ),
  },
];

export const adminTemplateColumns: ColumnDef<AdminTemplateRow>[] = [
  {
    accessorKey: "title",
    header: "Название",
    cell: ({ row }) => (
      <span className="font-medium text-white">{row.original.title}</span>
    ),
  },
  {
    id: "system",
    header: "Тип",
    cell: ({ row }) =>
      row.original.isSystem ? (
        <Badge variant="default">Системный</Badge>
      ) : (
        <span className="text-brand-muted">Пользовательский</span>
      ),
  },
  {
    accessorKey: "matchCount",
    header: "Матчей",
    cell: ({ row }) => {
      const count = row.original.matchCount;
      return (
        <span className="tabular-nums">{count === null ? "—" : count}</span>
      );
    },
  },
  {
    accessorKey: "description",
    header: "Описание",
    cell: ({ row }) => (
      <span className="line-clamp-2 max-w-md text-brand-muted">
        {row.original.description ?? "—"}
      </span>
    ),
  },
];
