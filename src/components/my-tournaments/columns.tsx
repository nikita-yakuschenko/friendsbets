"use client";

import Link from "next/link";
import {
  IconArrowsSort,
  IconChevronDown,
  IconChevronUp,
} from "@tabler/icons-react";
import { type ColumnDef } from "@tanstack/react-table";
import { InviteCodeCopyCell } from "@/components/admin/games/invite-code-copy-cell";
import { ChangeAccessModeControl } from "@/components/my-tournaments/change-access-mode-control";
import { ChangeScoringRuleControl } from "@/components/my-tournaments/change-scoring-rule-control";
import { MyTournamentRowActions } from "@/components/my-tournaments/my-tournament-row-actions";
import { Button } from "@/components/ui/button";
import { gamePath } from "@/lib/game-path";
import { formatDateTime } from "@/lib/utils";
import type { MyTournamentRow, ScoringRuleOption } from "@/components/my-tournaments/types";

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

export function createMyTournamentsColumns(
  scoringRules: ScoringRuleOption[],
): ColumnDef<MyTournamentRow>[] {
  return [
    {
      accessorKey: "title",
      header: ({ column }) => (
        <SortableHeader column={column} title="Турнир" />
      ),
      filterFn: (row, _columnId, filterValue) => {
        const query = String(filterValue).toLowerCase().trim();
        if (!query) return true;
        const game = row.original;
        return (
          game.title.toLowerCase().includes(query) ||
          game.inviteCode.toLowerCase().includes(query) ||
          (game.sourceLabel?.toLowerCase().includes(query) ?? false)
        );
      },
      cell: ({ row }) => {
        const game = row.original;
        return (
          <div className="min-w-0 max-w-md py-1">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <Link
                href={gamePath(game.inviteCode)}
                className="font-medium text-white hover:text-brand-lime"
              >
                {game.title}
              </Link>
              {game.isActive ? (
                <span className="rounded-md bg-brand-lime/15 px-2 py-0.5 text-xs font-medium text-brand-lime">
                  Текущий
                </span>
              ) : null}
            </div>
            {game.sourceLabel ? (
              <p className="mt-1 text-sm text-brand-muted">{game.sourceLabel}</p>
            ) : null}
            <p className="mt-2 text-xs leading-relaxed text-brand-muted">
              {game.organizerLabel}: {game.organizerNames}
              <span className="mx-1.5 text-brand-neutral">·</span>
              <span className="tabular-nums">{game.participantsCount} уч.</span>
              <span className="mx-1.5 text-brand-neutral">·</span>
              {formatDateTime(new Date(game.createdAt))}
            </p>
          </div>
        );
      },
    },
    {
      id: "invite",
      header: "Приглашение",
      cell: ({ row }) => {
        const game = row.original;
        return (
          <InviteCodeCopyCell
            inviteCode={game.inviteCode}
            inviteLinkUrl={game.inviteLinkUrl}
            compact
          />
        );
      },
      enableSorting: false,
    },
    {
      id: "scoring",
      header: "Очки",
      cell: ({ row }) => {
        const game = row.original;
        return (
          <ChangeScoringRuleControl
            gameId={game.id}
            scoringRuleId={game.scoringRuleId}
            scoringRuleTitle={game.scoringRuleTitle}
            canChangeTournamentSettings={game.canChangeTournamentSettings}
            tournamentStarted={game.tournamentStarted}
            scoringRules={scoringRules}
          />
        );
      },
      enableSorting: false,
    },
    {
      id: "access",
      header: "Доступ",
      cell: ({ row }) => {
        const game = row.original;
        return (
          <ChangeAccessModeControl
            gameId={game.id}
            accessMode={game.accessMode}
            canChange={game.canChangeTournamentSettings}
            tournamentStarted={game.tournamentStarted}
          />
        );
      },
      enableSorting: false,
    },
    {
      id: "actions",
      header: () => <span className="sr-only">Действия</span>,
      cell: ({ row }) => <MyTournamentRowActions game={row.original} />,
      enableSorting: false,
    },
  ];
}
