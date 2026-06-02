"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  IconHome,
  IconTrophy,
  IconTarget,
  IconBroadcast,
  IconDots,
  IconClipboardList,
} from "@tabler/icons-react";
import { LiveNavLabel } from "@/components/layout/live-nav-label";
import { gamePath } from "@/lib/game-path";
import { gamePlatformViewPath } from "@/lib/game-platform-view";
import { cn } from "@/lib/utils";

export function MobileBottomNav({
  gameInviteCode,
  gameOversightMode = false,
}: {
  gameInviteCode: string;
  gameOversightMode?: boolean;
}) {
  const pathname = usePathname();
  const path = (segment?: string) =>
    gameOversightMode
      ? gamePlatformViewPath(gameInviteCode, segment)
      : gamePath(gameInviteCode, segment);

  const items = [
    { href: path(), label: "Турнир", icon: IconHome },
    gameOversightMode
      ? {
          href: path("control"),
          label: "Контроль",
          icon: IconClipboardList,
        }
      : {
          href: path("predictions"),
          label: "Прогнозы",
          icon: IconTarget,
        },
    { href: path("leaderboard"), label: "Таблица", icon: IconTrophy },
    { href: path("live"), label: "Лайв", icon: IconBroadcast, isLive: true },
    { href: path("more"), label: "Ещё", icon: IconDots },
  ];

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-brand-neutral bg-brand-surface/95 backdrop-blur md:hidden">
      <div className="mx-auto grid max-w-lg grid-cols-5 px-2 pb-[env(safe-area-inset-bottom)] pt-2">
        {items.map((item) => {
          const active = pathname === item.href.split("?")[0];
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
