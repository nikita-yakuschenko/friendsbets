"use client";

import Link from "next/link";
import {
  IconArrowsSort,
  IconChevronDown,
  IconChevronUp,
} from "@tabler/icons-react";
import { type ColumnDef } from "@tanstack/react-table";
import { DeleteGameButton } from "@/components/admin/delete-game-button";
import { InviteCodeCopyCell } from "@/components/admin/games/invite-code-copy-cell";
import { Button } from "@/components/ui/button";
import { gamePath } from "@/lib/game-path";
import { formatDateTime } from "@/lib/utils";
import type { AdminGameRow } from "@/components/admin/games/types";

function SortableHeader({
  column,
  title,
}: {
  column: {
    getIsSorted: () => false | "asc" | "desc";
    toggleSorting: (desc?: boolean) => void;
  };
  title: string;
}) {
  const sorted = column.getIsSorted();

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="-ml-3 h-8 px-2 text-brand-muted hover:text-white"
      onClick={() => column.toggleSorting(sorted === "asc")}
    >
      {title}
      {sorted === "asc" ? (
        <IconChevronUp className="ml-1 size-4" />
      ) : sorted === "desc" ? (
        <IconChevronDown className="ml-1 size-4" />
      ) : (
        <IconArrowsSort className="ml-1 size-4 opacity-50" />
      )}
    </Button>
  );
}

export const adminGamesColumns: ColumnDef<AdminGameRow>[] = [
  {
    accessorKey: "title",
    header: ({ column }) => (
      <SortableHeader column={column} title="Название" />
    ),
    filterFn: (row, _columnId, filterValue) => {
      const query = String(filterValue).toLowerCase().trim();
      if (!query) return true;
      const game = row.original;
      return (
        game.title.toLowerCase().includes(query) ||
        game.inviteCode.toLowerCase().includes(query)
      );
    },
  },
  {
    accessorKey: "inviteCode",
    header: ({ column }) => (
      <SortableHeader column={column} title="Код приглашения" />
    ),
    cell: ({ row }) => {
      const game = row.original;
      return (
        <InviteCodeCopyCell
          inviteCode={game.inviteCode}
          inviteLinkUrl={game.inviteLinkUrl}
        />
      );
    },
  },
  {
    accessorKey: "scoringRuleTitle",
    header: "Правила очков",
  },
  {
    accessorKey: "participantsCount",
    header: ({ column }) => (
      <SortableHeader column={column} title="Участники" />
    ),
    cell: ({ row }) => (
      <span className="tabular-nums">{row.getValue("participantsCount")}</span>
    ),
  },
  {
    accessorKey: "createdAt",
    header: ({ column }) => <SortableHeader column={column} title="Создан" />,
    sortingFn: (rowA, rowB) =>
      new Date(rowA.original.createdAt).getTime() -
      new Date(rowB.original.createdAt).getTime(),
    cell: ({ row }) =>
      formatDateTime(new Date(row.getValue("createdAt") as string)),
  },
  {
    id: "actions",
    header: () => <span className="sr-only">Действия</span>,
    cell: ({ row }) => {
      const game = row.original;
      return (
        <div className="flex items-center justify-end gap-3">
          <Link
            href={gamePath(game.inviteCode)}
            className="text-sm font-medium text-brand-lime hover:underline"
          >
            Открыть
          </Link>
          <DeleteGameButton
            gameId={game.id}
            gameTitle={game.title}
            inviteCode={game.inviteCode}
          />
        </div>
      );
    },
    enableSorting: false,
  },
];
