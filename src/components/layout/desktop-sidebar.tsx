"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  IconHome,
  IconTarget,
  IconTrophy,
  IconBroadcast,
  IconShield,
} from "@tabler/icons-react";
import { BrandLogo } from "@/components/brand/logo";
import { LiveNavLabel } from "@/components/layout/live-nav-label";
import { Button } from "@/components/ui/button";
import { gamePath } from "@/lib/game-path";
import { shellHeaderHeightClass } from "@/components/layout/shell-header";
import { cn } from "@/lib/utils";

const gameLinks = [
  { href: "base", label: "Турнир", icon: IconHome },
  { href: "predictions", label: "Прогнозы", icon: IconTarget },
  { href: "leaderboard", label: "Таблица", icon: IconTrophy },
  { href: "live", label: "Лайв", icon: IconBroadcast, isLive: true },
];

function navLinkClass(active: boolean) {
  return cn(
    "flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
    active
      ? "bg-brand-lime/10 text-brand-lime"
      : "text-brand-muted hover:bg-brand-neutral/30 hover:text-white",
  );
}

export function DesktopSidebar({
  gameInviteCode,
  isPlatformAdmin,
  canManageGame,
}: {
  gameInviteCode?: string;
  isPlatformAdmin: boolean;
  canManageGame: boolean;
}) {
  const pathname = usePathname();
  const inviteFromPath = pathname.match(/^\/game\/([^/]+)/)?.[1];
  const activeInviteCode = gameInviteCode ?? inviteFromPath;

  return (
    <aside className="hidden md:sticky md:top-0 md:flex md:h-screen md:max-h-screen md:w-64 md:shrink-0 md:flex-col md:overflow-hidden md:border-r md:border-brand-neutral md:bg-brand-surface/50">
      <div
        className={cn(
          shellHeaderHeightClass,
          "flex flex-col justify-center border-b border-brand-neutral/60 px-5 py-4 md:py-0",
        )}
      >
        <BrandLogo className="whitespace-nowrap" />
      </div>

      <nav className="flex flex-1 flex-col gap-1 overflow-hidden px-3 py-4">
        {activeInviteCode &&
          gameLinks.map((link) => {
            const href =
              link.href === "base"
                ? gamePath(activeInviteCode)
                : gamePath(activeInviteCode, link.href);
            const active = pathname === href;
            const Icon = link.icon;
            return (
              <Link key={href} href={href} className={navLinkClass(active)}>
                <Icon className="h-4 w-4 shrink-0" stroke={1.75} />
                {"isLive" in link && link.isLive ? (
                  <LiveNavLabel showIcon={false} />
                ) : (
                  link.label
                )}
              </Link>
            );
          })}

        {(isPlatformAdmin || canManageGame) && (
          <>
            {activeInviteCode && (
              <div className="my-2 h-px bg-brand-neutral/60" aria-hidden="true" />
            )}
            <Link href="/admin" className={navLinkClass(pathname.startsWith("/admin"))}>
              <IconShield className="h-4 w-4 shrink-0" stroke={1.75} />
              Админка
            </Link>
          </>
        )}
      </nav>

      <div className="shrink-0 border-t border-brand-neutral/60 p-3">
        <Link href="/create" className="block">
          <Button className="w-full">Создать турнир</Button>
        </Link>
      </div>
    </aside>
  );
}
