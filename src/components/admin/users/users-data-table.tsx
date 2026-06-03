"use client";

import { useMemo, useState } from "react";
import { AdminUserCard } from "@/components/admin/users/admin-user-card";
import { useAdminUsersColumns } from "@/components/admin/users/columns";
import type { AdminGameOption, AdminUserRow } from "@/components/admin/users/types";
import { AdminListShell } from "@/components/admin/admin-list-shell";
import { DataTable } from "@/components/ui/data-table";

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
  "font-ibm-plex font-normal [&_td]:py-2.5 [&_td]:font-normal [&_th]:py-2.5 [&_th]:font-normal";

export function AdminUsersDataTable({
  data,
  games,
}: {
  data: AdminUserRow[];
  games: AdminGameOption[];
}) {
  const columns = useAdminUsersColumns(games);
  const [query, setQuery] = useState("");

  const filtered = useMemo(
    () => sortUsers(filterUsers(data, query)),
    [data, query],
  );

  return (
    <AdminListShell
      query={query}
      onQueryChange={setQuery}
      placeholder="Поиск по имени или email…"
      emptyMessage="Нет пользователей."
      count={filtered.length}
      mobile={filtered.map((user) => (
        <AdminUserCard key={user.id} user={user} games={games} />
      ))}
      desktop={
        <DataTable
          columns={columns}
          data={filtered}
          emptyMessage="Нет пользователей."
          tableClassName={tableClassName}
        />
      }
    />
  );
}
