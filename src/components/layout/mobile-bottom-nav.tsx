"use client";

import type { ComponentType } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  IconBallFootball,
  IconTrophy,
  IconTarget,
  IconBroadcast,
  IconDots,
  IconClipboardList,
  IconUser,
  IconUserPlus,
  IconCirclePlus,
  IconLayoutGrid,
  IconShield,
} from "@tabler/icons-react";
import { LiveNavLabel } from "@/components/layout/live-nav-label";
import { useNotificationUnread } from "@/components/notifications/notification-unread-provider";
import { NavBadge } from "@/components/ui/nav-badge";
import { gamePath } from "@/lib/game-path";
import { gamePlatformViewPath } from "@/lib/game-platform-view";
import { isGameHomePath } from "@/lib/shell-page-title";
import { cn } from "@/lib/utils";

type NavItem = {
  href: string;
  label: string;
  icon: ComponentType<{ className?: string; stroke?: number }>;
  isLive?: boolean;
};

export function MobileBottomNav({
  gameInviteCode,
  gameOversightMode = false,
  hasGames,
  isPlatformAdmin = false,
}: {
  gameInviteCode?: string;
  gameOversightMode?: boolean;
  hasGames: boolean;
  isPlatformAdmin?: boolean;
}) {
  const pathname = usePathname();
  const { unreadCount } = useNotificationUnread();
  const gamePathFor = (segment?: string) =>
    gameOversightMode
      ? gamePlatformViewPath(gameInviteCode!, segment)
      : gamePath(gameInviteCode!, segment);

  let items: NavItem[];

  if (!hasGames && isPlatformAdmin) {
    items = [
      { href: "/", label: "Мои", icon: IconLayoutGrid },
      { href: "/admin", label: "Платформа", icon: IconShield },
      { href: "/create", label: "Создать", icon: IconCirclePlus },
      { href: "/profile", label: "Профиль", icon: IconUser },
    ];
  } else if (!hasGames) {
    items = [
      { href: "/", label: "Мои", icon: IconLayoutGrid },
      { href: "/create", label: "Создать", icon: IconCirclePlus },
      { href: "/join", label: "Найти", icon: IconUserPlus },
      { href: "/profile", label: "Профиль", icon: IconUser },
    ];
  } else if (gameInviteCode) {
    items = [
      { href: gamePathFor(), label: "Турнир", icon: IconBallFootball },
      gameOversightMode
        ? {
            href: gamePathFor("control"),
            label: "Контроль",
            icon: IconClipboardList,
          }
        : {
            href: gamePathFor("predictions"),
            label: "Прогнозы",
            icon: IconTarget,
          },
      { href: gamePathFor("leaderboard"), label: "Таблица", icon: IconTrophy },
      { href: gamePathFor("live"), label: "Лайв", icon: IconBroadcast, isLive: true },
      { href: gamePathFor("more"), label: "Ещё", icon: IconDots },
    ];
  } else if (hasGames) {
    items = [
      { href: "/", label: "Мои", icon: IconLayoutGrid },
      ...(isPlatformAdmin
        ? [{ href: "/admin", label: "Платформа", icon: IconShield }]
        : [
            { href: "/create", label: "Создать", icon: IconCirclePlus },
            { href: "/join", label: "Найти", icon: IconUserPlus },
          ]),
      { href: "/profile", label: "Профиль", icon: IconUser },
    ];
  } else {
    items = [{ href: "/", label: "Мои", icon: IconLayoutGrid }];
  }

  const cols = items.length <= 4 ? "grid-cols-4" : "grid-cols-5";

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 box-border w-full max-w-[100vw] overflow-hidden border-t border-brand-neutral bg-brand-surface/95 backdrop-blur md:hidden"
      aria-label="Основная навигация"
    >
      <div
        className={cn(
          "mx-auto box-border w-full max-w-lg grid px-2 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom,0px))]",
          cols,
        )}
      >
        {items.map((item) => {
          const hrefBase = item.href.split("?")[0];
          const active =
            item.label === "Турнир"
              ? isGameHomePath(pathname) &&
                pathname.replace(/\/$/, "") === hrefBase.replace(/\/$/, "")
              : pathname === hrefBase;
          const Icon = item.icon;
          const showUnreadBadge =
            item.label === "Ещё" && unreadCount > 0;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex min-w-0 flex-col items-center gap-1 rounded-xl px-1 py-2 text-xs",
                active ? "text-brand-lime" : "text-brand-muted",
              )}
            >
              <span className="relative inline-flex">
                <Icon className="h-5 w-5" stroke={1.75} />
                {showUnreadBadge ? <NavBadge count={unreadCount} /> : null}
              </span>
              {item.isLive ? (
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
