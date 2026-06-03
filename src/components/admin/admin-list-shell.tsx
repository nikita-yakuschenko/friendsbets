"use client";

import { ADMIN_LIST_EMPTY_CLASS } from "@/components/admin/admin-detail-row";
import { Input } from "@/components/ui/input";

export function AdminListShell({
  query,
  onQueryChange,
  placeholder,
  emptyMessage,
  count,
  mobile,
  desktop,
}: {
  query: string;
  onQueryChange: (value: string) => void;
  placeholder: string;
  emptyMessage: string;
  count: number;
  mobile: React.ReactNode;
  desktop: React.ReactNode;
}) {
  return (
    <div className="space-y-4">
      <Input
        placeholder={placeholder}
        value={query}
        onChange={(event) => onQueryChange(event.target.value)}
        className="w-full md:max-w-sm"
      />

      <div className="space-y-3 lg:hidden">
        {count === 0 ? (
          <p className={ADMIN_LIST_EMPTY_CLASS}>{emptyMessage}</p>
        ) : (
          mobile
        )}
        <p className="text-sm text-brand-muted">{count} записей</p>
      </div>

      <div className="hidden lg:block">{desktop}</div>
    </div>
  );
}
