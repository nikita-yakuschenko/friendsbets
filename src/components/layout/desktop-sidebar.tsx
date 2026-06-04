"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  IconHome,
  IconSoccerField,
  IconTarget,
  IconTrophy,
  IconBroadcast,
  IconShield,
  IconUser,
  IconUserPlus,
  IconCirclePlus,
  IconClipboardList,
  IconBell,
  IconDots,
} from "@tabler/icons-react";
import { BrandLogo } from "@/components/brand/logo";
import { LiveNavLabel } from "@/components/layout/live-nav-label";
import { useNotificationUnread } from "@/components/notifications/notification-unread-provider";
import { NavBadge } from "@/components/ui/nav-badge";
import { Button } from "@/components/ui/button";
import { gamePath } from "@/lib/game-path";
import { gamePlatformViewPath } from "@/lib/game-platform-view";
import { shellHeaderHeightClass } from "@/components/layout/shell-header";
import { cn } from "@/lib/utils";

function buildGameLinks(oversight: boolean) {
  return [
    { href: "base", label: "Турнир", icon: IconHome },
    oversight
      ? { href: "control", label: "Контроль", icon: IconClipboardList }
      : { href: "predictions", label: "Прогнозы", icon: IconTarget },
    { href: "leaderboard", label: "Таблица", icon: IconTrophy },
    { href: "live", label: "Лайв", icon: IconBroadcast, isLive: true },
  ] as const;
}

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
  hasGames,
  isPlatformAdmin,
  canManageGame,
  gameOversightMode = false,
}: {
  gameInviteCode?: string;
  hasGames: boolean;
  isPlatformAdmin: boolean;
  canManageGame: boolean;
  gameOversightMode?: boolean;
}) {
  const pathname = usePathname();
  const { unreadCount } = useNotificationUnread();
  const inviteFromPath = pathname.match(/^\/game\/([^/]+)/)?.[1];
  const activeInviteCode = hasGames ? (gameInviteCode ?? inviteFromPath) : undefined;
  const gameLinks = buildGameLinks(gameOversightMode);
  const gameHref = (segment?: string) =>
    gameOversightMode && activeInviteCode
      ? gamePlatformViewPath(activeInviteCode, segment)
      : gamePath(activeInviteCode!, segment);
  const showAdminLink =
    isPlatformAdmin ||
    (hasGames &&
      canManageGame &&
      (Boolean(activeInviteCode) || pathname.startsWith("/admin")));

  return (
    <aside className="hidden md:flex md:h-full md:max-h-full md:w-64 md:shrink-0 md:flex-col md:overflow-hidden md:border-r md:border-brand-neutral md:bg-brand-surface/50">
      <div
        className={cn(
          shellHeaderHeightClass,
          "flex flex-col justify-center border-b border-brand-neutral/60 px-5 py-4 md:py-0",
        )}
      >
        <BrandLogo className="whitespace-nowrap" />
      </div>

      <nav className="flex flex-1 flex-col gap-1 overflow-hidden px-3 py-4">
        <Link href="/" className={navLinkClass(pathname === "/")}>
          <IconSoccerField className="h-4 w-4 shrink-0" stroke={1.75} />
          Мои турниры
        </Link>
        <Link href="/profile" className={navLinkClass(pathname === "/profile")}>
          <IconUser className="h-4 w-4 shrink-0" stroke={1.75} />
          Профиль
        </Link>

        {showAdminLink && !hasGames && isPlatformAdmin ? (
          <>
            <div className="my-2 h-px bg-brand-neutral/60" aria-hidden="true" />
            <Link href="/admin" className={navLinkClass(pathname.startsWith("/admin"))}>
              <IconShield className="h-4 w-4 shrink-0" stroke={1.75} />
              Платформа
            </Link>
          </>
        ) : null}

        {!hasGames ? (
          <>
            <div className="my-2 h-px bg-brand-neutral/60" aria-hidden="true" />
            <Link href="/create" className={navLinkClass(pathname === "/create")}>
              <IconCirclePlus className="h-4 w-4 shrink-0" stroke={1.75} />
              Создать турнир
            </Link>
            <Link href="/join" className={navLinkClass(pathname === "/join")}>
              <IconUserPlus className="h-4 w-4 shrink-0" stroke={1.75} />
              Найти турнир
            </Link>
          </>
        ) : null}

        {hasGames && activeInviteCode ? (
          <>
            <div className="my-2 h-px bg-brand-neutral/60" aria-hidden="true" />
            {gameLinks.map((link) => {
              const href =
                link.href === "base" ? gameHref() : gameHref(link.href);
              const active = pathname === href.split("?")[0];
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
            <Link
              href={gameHref("more")}
              className={navLinkClass(
                pathname.replace(/\/$/, "") === gameHref("more").replace(/\/$/, ""),
              )}
            >
              <span className="relative inline-flex shrink-0">
                <IconDots className="h-4 w-4" stroke={1.75} />
                {unreadCount > 0 ? <NavBadge count={unreadCount} /> : null}
              </span>
              Ещё
            </Link>
            <Link
              href={gameHref("more/notifications")}
              className={navLinkClass(
                /\/more\/notifications\/?$/.test(pathname),
              )}
            >
              <span className="relative inline-flex shrink-0">
                <IconBell className="h-4 w-4" stroke={1.75} />
                {unreadCount > 0 ? <NavBadge count={unreadCount} /> : null}
              </span>
              Уведомления
            </Link>
          </>
        ) : null}

        {showAdminLink && (hasGames || !isPlatformAdmin) ? (
          <>
            {activeInviteCode ? (
              <div className="my-2 h-px bg-brand-neutral/60" aria-hidden="true" />
            ) : null}
            <Link href="/admin" className={navLinkClass(pathname.startsWith("/admin"))}>
              <IconShield className="h-4 w-4 shrink-0" stroke={1.75} />
              {isPlatformAdmin ? "Платформа" : "Мой турнир"}
            </Link>
          </>
        ) : null}
      </nav>

      {hasGames &&
      pathname !== "/" &&
      pathname !== "/join" ? (
        <div className="shrink-0 border-t border-brand-neutral/60 p-3">
          <Link href="/join" className="block">
            <Button className="w-full">Добавить турнир</Button>
          </Link>
        </div>
      ) : null}
    </aside>
  );
}
