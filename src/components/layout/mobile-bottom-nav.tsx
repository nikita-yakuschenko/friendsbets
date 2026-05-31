"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Trophy, Target, Radio, MoreHorizontal } from "lucide-react";
import { LiveNavLabel } from "@/components/layout/live-nav-label";
import { gamePath } from "@/lib/game-path";
import { cn } from "@/lib/utils";

export function MobileBottomNav({ gameSlug }: { gameSlug: string }) {
  const pathname = usePathname();

  const items = [
    { href: gamePath(gameSlug), label: "Игра", icon: Home },
    { href: gamePath(gameSlug, "predictions"), label: "Прогнозы", icon: Target },
    { href: gamePath(gameSlug, "leaderboard"), label: "Таблица", icon: Trophy },
    { href: gamePath(gameSlug, "live"), label: "Лайв", icon: Radio, isLive: true },
    { href: gamePath(gameSlug, "more"), label: "Ещё", icon: MoreHorizontal },
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
              <Icon className="h-5 w-5" />
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
