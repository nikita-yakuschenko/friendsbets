import Link from "next/link";
import type { AdminTabId } from "@/lib/admin-tabs";
import { cn } from "@/lib/utils";

export function AdminTabNav({
  activeTab,
  tabs,
}: {
  activeTab: AdminTabId;
  tabs: { id: AdminTabId; label: string }[];
}) {
  return (
    <nav
      className="mb-6 flex flex-wrap gap-1 rounded-xl border border-brand-neutral bg-brand-surface/50 p-1"
      aria-label="Разделы управления"
    >
      {tabs.map((tab) => {
        const active = tab.id === activeTab;
        return (
          <Link
            key={tab.id}
            href={`/admin?tab=${tab.id}`}
            className={cn(
              "rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-brand-lime text-black"
                : "text-brand-muted hover:bg-brand-neutral/30 hover:text-white",
            )}
            aria-current={active ? "page" : undefined}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
