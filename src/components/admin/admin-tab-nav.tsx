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
      className="mb-6 flex w-full max-w-full flex-nowrap gap-1 overflow-x-auto rounded-xl border border-brand-neutral bg-brand-surface/50 p-1 scrollbar-none"
      aria-label="Разделы управления"
    >
      {tabs.map((tab) => {
        const active = tab.id === activeTab;
        return (
          <Link
            key={tab.id}
            href={`/admin?tab=${tab.id}`}
            className={cn(
              "shrink-0 whitespace-nowrap rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors sm:px-3 sm:py-2 sm:text-sm",
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
