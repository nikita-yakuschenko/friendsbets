"use client";

import {
  IconArrowsSort,
  IconChevronDown,
  IconChevronUp,
} from "@tabler/icons-react";
import { type ColumnDef } from "@tanstack/react-table";
import { GameMembershipList } from "@/components/admin/users/game-membership-list";
import { SendTestEmailButton } from "@/components/admin/users/send-test-email-button";
import type { AdminUserRow } from "@/components/admin/users/types";
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

export const adminUsersColumns: ColumnDef<AdminUserRow>[] = [
  {
    accessorKey: "name",
    header: ({ column }) => <SortableHeader column={column} title="Имя" />,
    cell: ({ row }) => (
      <div className="min-w-[8rem]">
        <p className="font-medium text-white">{row.original.name}</p>
        <p className="text-xs text-brand-muted">{row.original.email}</p>
      </div>
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
    header: "Роль на платформе",
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
    id: "testEmail",
    header: "Почта",
    cell: ({ row }) => (
      <SendTestEmailButton
        userId={row.original.id}
        email={row.original.email}
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
      <span className="whitespace-nowrap text-sm text-brand-muted">
        {formatDateTime(new Date(row.original.createdAt))}
      </span>
    ),
  },
];
