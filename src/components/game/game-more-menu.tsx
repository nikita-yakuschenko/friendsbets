import type { ComponentType } from "react";
import Link from "next/link";
import { IconLogout } from "@tabler/icons-react";
import { logoutAction } from "@/server/actions/auth";

export type GameMoreMenuItem = {
  href: string;
  label: string;
  icon: ComponentType<{ className?: string; stroke?: number }>;
};

export function GameMoreMenu({
  items,
  showLogout = true,
}: {
  items: GameMoreMenuItem[];
  showLogout?: boolean;
}) {
  return (
    <nav aria-label="Дополнительные разделы">
      <ul className="divide-y divide-brand-neutral/70">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className="flex items-center gap-3 py-4 text-sm text-brand-muted transition-colors hover:text-white"
              >
                <Icon className="h-5 w-5 shrink-0" stroke={1.75} aria-hidden />
                <span>{item.label}</span>
              </Link>
            </li>
          );
        })}
        {showLogout ? (
          <li>
            <form action={logoutAction}>
              <button
                type="submit"
                className="flex w-full items-center gap-3 py-4 text-sm text-brand-muted transition-colors hover:text-white"
              >
                <IconLogout className="h-5 w-5 shrink-0" stroke={1.75} aria-hidden />
                <span>Выйти</span>
              </button>
            </form>
          </li>
        ) : null}
      </ul>
    </nav>
  );
}