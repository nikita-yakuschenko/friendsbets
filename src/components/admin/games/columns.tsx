"use client";

import Link from "next/link";
import {
  IconArrowsSort,
  IconArrowUpRight,
  IconChevronDown,
  IconChevronUp,
} from "@tabler/icons-react";
import { type ColumnDef } from "@tanstack/react-table";
import { DeleteGameButton } from "@/components/admin/delete-game-button";
import { InviteCodeCopyCell } from "@/components/admin/games/invite-code-copy-cell";
import { Button } from "@/components/ui/button";
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
      className="-ml-2 h-7 px-1.5 text-xs text-brand-muted hover:text-white"
      onClick={() => column.toggleSorting(sorted === "asc")}
    >
      {title}
      {sorted === "asc" ? (
        <IconChevronUp className="ml-0.5 size-3.5" />
      ) : sorted === "desc" ? (
        <IconChevronDown className="ml-0.5 size-3.5" />
      ) : (
        <IconArrowsSort className="ml-0.5 size-3.5 opacity-50" />
      )}
    </Button>
  );
}

const iconLinkClass =
  "inline-flex size-8 shrink-0 items-center justify-center rounded-md text-brand-muted transition-colors hover:bg-brand-neutral/40 hover:text-brand-lime focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-lime/60";

export const adminGamesColumns: ColumnDef<AdminGameRow>[] = [
  {
    accessorKey: "title",
    header: ({ column }) => (
      <SortableHeader column={column} title="Турнир" />
    ),
    cell: ({ row }) => {
      const game = row.original;
      return (
        <div className="min-w-0">
          <Link
            href={game.openHref}
            className="block truncate font-medium text-white hover:text-brand-lime"
            title={game.title}
          >
            {game.title}
          </Link>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-brand-muted">
            <InviteCodeCopyCell
              inviteCode={game.inviteCode}
              inviteLinkUrl={game.inviteLinkUrl}
              compact
            />
            <span className="tabular-nums">{game.participantsCount} уч.</span>
            <span className="truncate" title={game.scoringRuleTitle}>
              {game.scoringRuleTitle}
            </span>
          </div>
        </div>
      );
    },
    filterFn: (row, _columnId, filterValue) => {
      const query = String(filterValue).toLowerCase().trim();
      if (!query) return true;
      const game = row.original;
      return (
        game.title.toLowerCase().includes(query) ||
        game.inviteCode.toLowerCase().includes(query) ||
        game.createdByName.toLowerCase().includes(query) ||
        game.organizerNames.toLowerCase().includes(query)
      );
    },
  },
  {
    id: "people",
    header: "Люди",
    cell: ({ row }) => {
      const game = row.original;
      return (
        <div className="min-w-0 text-xs leading-relaxed">
          <p className="truncate text-white" title={game.createdByName}>
            <span className="text-brand-muted">Созд.: </span>
            {game.createdByName}
          </p>
          <p
            className="truncate text-white"
            title={game.organizerNames || undefined}
          >
            <span className="text-brand-muted">Орг.: </span>
            {game.organizerNames || "—"}
          </p>
        </div>
      );
    },
    enableSorting: false,
  },
  {
    accessorKey: "createdAt",
    header: ({ column }) => <SortableHeader column={column} title="Создан" />,
    sortingFn: (rowA, rowB) =>
      new Date(rowA.original.createdAt).getTime() -
      new Date(rowB.original.createdAt).getTime(),
    cell: ({ row }) => (
      <span className="whitespace-nowrap text-xs tabular-nums text-brand-muted">
        {formatDateTime(new Date(row.original.createdAt))}
      </span>
    ),
  },
  {
    id: "actions",
    header: () => <span className="sr-only">Действия</span>,
    cell: ({ row }) => {
      const game = row.original;
      return (
        <div className="flex items-center justify-end gap-0.5">
          <Link
            href={game.openHref}
            className={iconLinkClass}
            title="Открыть турнир"
          >
            <IconArrowUpRight className="size-4" stroke={1.75} aria-hidden />
            <span className="sr-only">Открыть</span>
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
