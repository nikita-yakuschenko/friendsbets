"use client";

import { useMemo, useState } from "react";
import { AdminUserCard } from "@/components/admin/users/admin-user-card";
import { useAdminUsersColumns } from "@/components/admin/users/columns";
import type { AdminGameOption, AdminUserRow } from "@/components/admin/users/types";
import { AdminListShell } from "@/components/admin/admin-list-shell";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";

const PAGE_SIZE = 10;

function filterUsers(rows: AdminUserRow[], query: string) {
  const q = query.toLowerCase().trim();
  if (!q) return rows;
  return rows.filter(
    (user) =>
      user.name.toLowerCase().includes(q) ||
      user.email.toLowerCase().includes(q),
  );
}

function sortUsers(rows: AdminUserRow[]) {
  return [...rows].sort((a, b) => a.name.localeCompare(b.name, "ru"));
}

const tableClassName =
  "font-ibm-plex font-normal [&_table]:table-fixed [&_table]:w-full [&_td]:py-2.5 [&_td]:font-normal [&_th]:py-2.5 [&_th]:font-normal";

export function AdminUsersDataTable({
  data,
  games,
}: {
  data: AdminUserRow[];
  games: AdminGameOption[];
}) {
  const columns = useAdminUsersColumns(games);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);

  const filtered = useMemo(
    () => sortUsers(filterUsers(data, query)),
    [data, query],
  );

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount - 1);
  const paged = filtered.slice(
    currentPage * PAGE_SIZE,
    currentPage * PAGE_SIZE + PAGE_SIZE,
  );

  function onQueryChange(value: string) {
    setQuery(value);
    setPage(0);
  }

  return (
    <AdminListShell
      query={query}
      onQueryChange={onQueryChange}
      placeholder="Поиск по имени или email…"
      emptyMessage="Нет пользователей."
      count={filtered.length}
      mobile={
        <>
          {paged.map((user) => (
            <AdminUserCard key={user.id} user={user} games={games} />
          ))}
          {filtered.length > PAGE_SIZE ? (
            <MobilePagination
              page={currentPage}
              pageCount={pageCount}
              onPageChange={setPage}
            />
          ) : null}
        </>
      }
      desktop={
        <DataTable
          columns={columns}
          data={filtered}
          emptyMessage="Нет пользователей."
          pageSize={PAGE_SIZE}
          tableClassName={tableClassName}
        />
      }
    />
  );
}

function MobilePagination({
  page,
  pageCount,
  onPageChange,
}: {
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
}) {
  return (
    <div className="flex items-center justify-end gap-2 pt-2">
      <Button
        type="button"
        variant="secondary"
        size="sm"
        disabled={page <= 0}
        onClick={() => onPageChange(page - 1)}
      >
        Назад
      </Button>
      <span className="text-sm text-brand-muted">
        {page + 1} / {pageCount}
      </span>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        disabled={page >= pageCount - 1}
        onClick={() => onPageChange(page + 1)}
      >
        Далее
      </Button>
    </div>
  );
}
