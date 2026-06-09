"use client";

import { useMemo, useState } from "react";
import { AdminGameCard } from "@/components/admin/games/admin-game-card";
import { createAdminGamesColumns } from "@/components/admin/games/columns";
import type { AdminGameRow } from "@/components/admin/games/types";
import { AdminListShell } from "@/components/admin/admin-list-shell";
import { DataTable } from "@/components/ui/data-table";

function filterGames(rows: AdminGameRow[], query: string) {
  const q = query.toLowerCase().trim();
  if (!q) return rows;
  return rows.filter(
    (game) =>
      game.title.toLowerCase().includes(q) ||
      game.inviteCode.toLowerCase().includes(q) ||
      game.createdByName.toLowerCase().includes(q) ||
      game.organizerNames.toLowerCase().includes(q),
  );
}

function sortGames(rows: AdminGameRow[]) {
  return [...rows].sort((a, b) => a.title.localeCompare(b.title, "ru"));
}

const tableClassName =
  "font-ibm-plex text-sm [&_table]:table-fixed [&_td]:px-2 [&_td]:py-2 [&_td]:text-sm [&_th]:h-9 [&_th]:px-2 [&_th]:py-2 [&_th]:text-xs";

export function AdminGamesDataTable({
  data,
  canRenameGameTitle = false,
}: {
  data: AdminGameRow[];
  canRenameGameTitle?: boolean;
}) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(
    () => sortGames(filterGames(data, query)),
    [data, query],
  );

  const columns = useMemo(
    () => createAdminGamesColumns({ canRenameGameTitle }),
    [canRenameGameTitle],
  );

  return (
    <AdminListShell
      query={query}
      onQueryChange={setQuery}
      placeholder="Поиск по названию или коду приглашения…"
      emptyMessage="Нет игр."
      count={filtered.length}
      mobile={filtered.map((game) => (
        <AdminGameCard
          key={game.id}
          game={game}
          canRenameGameTitle={canRenameGameTitle}
        />
      ))}
      desktop={
        <DataTable
          columns={columns}
          data={filtered}
          emptyMessage="Нет игр."
          tableClassName={tableClassName}
        />
      }
    />
  );
}
