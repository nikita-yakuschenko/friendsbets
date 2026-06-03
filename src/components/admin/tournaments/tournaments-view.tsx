"use client";

import { useMemo, useState } from "react";
import { AdminTemplateCard } from "@/components/admin/tournaments/admin-template-card";
import { AdminTournamentCard } from "@/components/admin/tournaments/admin-tournament-card";
import {
  adminTemplateColumns,
  adminTournamentColumns,
} from "@/components/admin/tournaments/columns";
import type {
  AdminTemplateRow,
  AdminTournamentRow,
} from "@/components/admin/tournaments/types";
import {
  ADMIN_LIST_EMPTY_CLASS,
  AdminSectionHeading,
} from "@/components/admin/admin-detail-row";
import { DataTable } from "@/components/ui/data-table";
import { Input } from "@/components/ui/input";

const tableClassName =
  "font-ibm-plex font-normal [&_td]:py-2.5 [&_td]:font-normal [&_th]:py-2.5 [&_th]:font-normal";

function filterTournaments(rows: AdminTournamentRow[], query: string) {
  const q = query.toLowerCase().trim();
  if (!q) return rows;
  return rows.filter(
    (row) =>
      row.title.toLowerCase().includes(q) ||
      (row.externalId?.toLowerCase().includes(q) ?? false) ||
      row.status.toLowerCase().includes(q),
  );
}

function filterTemplates(rows: AdminTemplateRow[], query: string) {
  const q = query.toLowerCase().trim();
  if (!q) return rows;
  return rows.filter(
    (row) =>
      row.title.toLowerCase().includes(q) ||
      (row.description?.toLowerCase().includes(q) ?? false),
  );
}

function sortByTitle<T extends { title: string }>(rows: T[]) {
  return [...rows].sort((a, b) => a.title.localeCompare(b.title, "ru"));
}

function AdminRecordsSection<T>({
  title,
  emptyMessage,
  filtered,
  renderCard,
  columns,
}: {
  title: string;
  emptyMessage: string;
  filtered: T[];
  renderCard: (row: T) => React.ReactNode;
  columns: import("@tanstack/react-table").ColumnDef<T, unknown>[];
}) {
  return (
    <section className="space-y-3">
      <AdminSectionHeading>{title}</AdminSectionHeading>
      <div className="space-y-3 lg:hidden">
        {filtered.length === 0 ? (
          <p className={ADMIN_LIST_EMPTY_CLASS}>{emptyMessage}</p>
        ) : (
          filtered.map((row) => renderCard(row))
        )}
        <p className="text-sm text-brand-muted">{filtered.length} записей</p>
      </div>
      <div className="hidden lg:block">
        <DataTable
          columns={columns}
          data={filtered}
          emptyMessage={emptyMessage}
          tableClassName={tableClassName}
        />
      </div>
    </section>
  );
}

export function AdminTournamentsView({
  tournaments,
  templates,
}: {
  tournaments: AdminTournamentRow[];
  templates: AdminTemplateRow[];
}) {
  const [query, setQuery] = useState("");

  const filteredTournaments = useMemo(
    () => sortByTitle(filterTournaments(tournaments, query)),
    [tournaments, query],
  );

  const filteredTemplates = useMemo(
    () => sortByTitle(filterTemplates(templates, query)),
    [templates, query],
  );

  return (
    <div className="space-y-6">
      <Input
        placeholder="Поиск по названию турнира или шаблона…"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        className="w-full md:max-w-sm"
      />

      <AdminRecordsSection
        title="Турниры в базе"
        emptyMessage="Турниров пока нет."
        filtered={filteredTournaments}
        renderCard={(row) => (
          <AdminTournamentCard key={row.id} tournament={row} />
        )}
        columns={adminTournamentColumns}
      />

      <AdminRecordsSection
        title="Шаблоны для создания игр"
        emptyMessage="Шаблонов нет. Запустите seed."
        filtered={filteredTemplates}
        renderCard={(row) => <AdminTemplateCard key={row.id} template={row} />}
        columns={adminTemplateColumns}
      />
    </div>
  );
}
