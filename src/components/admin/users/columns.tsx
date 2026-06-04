"use client";

import Link from "next/link";
import { useMemo } from "react";
import {
  IconArrowsSort,
  IconChevronDown,
  IconChevronUp,
} from "@tabler/icons-react";
import { type ColumnDef } from "@tanstack/react-table";
import { AssignGameOrganizerControl } from "@/components/admin/users/assign-game-organizer-control";
import { DeleteUserButton } from "@/components/admin/users/delete-user-button";
import { GameMembershipList } from "@/components/admin/users/game-membership-list";
import { SendTestEmailButton } from "@/components/admin/users/send-test-email-button";
import type { AdminGameOption, AdminUserRow } from "@/components/admin/users/types";
import { UserAvatar } from "@/components/user/user-avatar";
import { UserRoleBadge } from "@/components/user/user-role-badge";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/utils";

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

export function useAdminUsersColumns(
  allGames: AdminGameOption[],
): ColumnDef<AdminUserRow>[] {
  return useMemo(
    () => [
      {
        accessorKey: "name",
        header: ({ column }) => <SortableHeader column={column} title="Пользователь" />,
        cell: ({ row }) => (
          <Link
            href={`/admin/users/${row.original.id}`}
            className="flex min-w-0 max-w-56 items-center gap-2.5 rounded-lg transition-colors hover:bg-brand-neutral/20"
          >
            <UserAvatar
              name={row.original.name}
              avatarUrl={row.original.avatarUrl}
              updatedAt={row.original.updatedAt}
              size="sm"
            />
            <div className="min-w-0">
              <p className="truncate font-medium text-white">{row.original.name}</p>
              <p className="truncate text-xs text-brand-muted">{row.original.email}</p>
            </div>
          </Link>
        ),
        filterFn: (row, _columnId, filterValue) => {
          const query = String(filterValue).toLowerCase().trim();
          if (!query) return true;
          const user = row.original;
          return (
            user.name.toLowerCase().includes(query) ||
            user.email.toLowerCase().includes(query)
          );
        },
      },
      {
        accessorKey: "platformRole",
        header: "Роль",
        cell: ({ row }) => <UserRoleBadge role={row.original.platformRole} />,
      },
      {
        id: "organizerGames",
        header: "Организатор",
        cell: ({ row }) => (
          <GameMembershipList games={row.original.organizerGames} variant="organizer" />
        ),
        enableSorting: false,
      },
      {
        id: "participantGames",
        header: "Участник",
        cell: ({ row }) => (
          <GameMembershipList
            games={row.original.participantGames}
            variant="participant"
          />
        ),
        enableSorting: false,
      },
      {
        id: "assignOrganizer",
        header: "Орг.",
        cell: ({ row }) => (
          <AssignGameOrganizerControl
            userId={row.original.id}
            userName={row.original.name}
            organizerGameIds={
              new Set(row.original.organizerGames.map((g) => g.id))
            }
            allGames={allGames}
            compact
          />
        ),
        enableSorting: false,
      },
      {
        accessorKey: "createdAt",
        header: ({ column }) => (
          <SortableHeader column={column} title="Регистрация" />
        ),
        cell: ({ row }) => (
          <span className="whitespace-nowrap text-xs text-brand-muted tabular-nums">
            {formatDateTime(new Date(row.original.createdAt))}
          </span>
        ),
      },
      {
        id: "actions",
        header: () => <span className="sr-only">Действия</span>,
        cell: ({ row }) => (
          <div className="flex items-center justify-end gap-0.5">
            <SendTestEmailButton
              userId={row.original.id}
              email={row.original.email}
            />
            <DeleteUserButton
              userId={row.original.id}
              userName={row.original.name}
            />
          </div>
        ),
        enableSorting: false,
      },
    ],
    [allGames],
  );
}
