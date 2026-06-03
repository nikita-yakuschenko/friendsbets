"use client";

import { useMemo, useState } from "react";
import { myTournamentsColumns } from "@/components/my-tournaments/columns";
import { MyTournamentCard } from "@/components/my-tournaments/my-tournament-card";
import type { MyTournamentRow } from "@/components/my-tournaments/types";
import { RECORD_CARD_EMPTY_CLASS } from "@/components/ui/record-card";
import { DataTable } from "@/components/ui/data-table";
import { Input } from "@/components/ui/input";

function filterTournaments(rows: MyTournamentRow[], query: string) {
  const q = query.toLowerCase().trim();
  if (!q) return rows;
  return rows.filter(
    (row) =>
      row.title.toLowerCase().includes(q) ||
      row.inviteCode.toLowerCase().includes(q) ||
      (row.sourceLabel?.toLowerCase().includes(q) ?? false),
  );
}

function sortTournaments(rows: MyTournamentRow[]) {
  return [...rows].sort((a, b) => {
    if (a.isActive !== b.isActive) return a.isActive ? -1 : 1;
    return a.title.localeCompare(b.title, "ru");
  });
}

export function MyTournamentsDataTable({ data }: { data: MyTournamentRow[] }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(
    () => sortTournaments(filterTournaments(data, query)),
    [data, query],
  );

  return (
    <div className="space-y-4">
      <Input
        placeholder="Поиск по названию, шаблону или коду…"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        className="w-full md:max-w-sm"
      />

      <div className="space-y-3 lg:hidden">
        {filtered.length === 0 ? (
          <p className={RECORD_CARD_EMPTY_CLASS}>Нет турниров.</p>
        ) : (
          filtered.map((tournament) => (
            <MyTournamentCard key={tournament.id} tournament={tournament} />
          ))
        )}
        <p className="text-sm text-brand-muted">{filtered.length} записей</p>
      </div>

      <div className="hidden lg:block">
        <DataTable
          columns={myTournamentsColumns}
          data={filtered}
          emptyMessage="Нет турниров."
          tableClassName="font-ibm-plex font-normal [&_td]:font-normal [&_th]:font-normal"
        />
      </div>
    </div>
  );
}
