"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  IconHome,
  IconTrophy,
  IconTarget,
  IconBroadcast,
  IconDots,
} from "@tabler/icons-react";
import { LiveNavLabel } from "@/components/layout/live-nav-label";
import { gamePath } from "@/lib/game-path";
import { cn } from "@/lib/utils";

export function MobileBottomNav({ gameInviteCode }: { gameInviteCode: string }) {
  const pathname = usePathname();

  const items = [
    { href: gamePath(gameInviteCode), label: "Турнир", icon: IconHome },
    { href: gamePath(gameInviteCode, "predictions"), label: "Прогнозы", icon: IconTarget },
    { href: gamePath(gameInviteCode, "leaderboard"), label: "Таблица", icon: IconTrophy },
    { href: gamePath(gameInviteCode, "live"), label: "Лайв", icon: IconBroadcast, isLive: true },
    { href: gamePath(gameInviteCode, "more"), label: "Ещё", icon: IconDots },
  ];

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-brand-neutral bg-brand-surface/95 backdrop-blur md:hidden">
      <div className="mx-auto grid max-w-lg grid-cols-5 px-2 pb-[env(safe-area-inset-bottom)] pt-2">
        {items.map((item) => {
          const active = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-1 rounded-xl px-1 py-2 text-xs",
                active ? "text-brand-lime" : "text-brand-muted",
              )}
            >
              <Icon className="h-5 w-5" stroke={1.75} />
              {"isLive" in item && item.isLive ? (
                <LiveNavLabel compact showIcon={false} />
              ) : (
                <span>{item.label}</span>
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
