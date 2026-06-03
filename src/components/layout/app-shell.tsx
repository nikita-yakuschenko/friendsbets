import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { IconCrown } from "@tabler/icons-react";
import { UserAvatar } from "@/components/user/user-avatar";
import { BrandLogo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { DesktopSidebar } from "@/components/layout/desktop-sidebar";
import { ShellDesktopPageTitle } from "@/components/layout/shell-desktop-page-title";
import { MobileBottomNav } from "@/components/layout/mobile-bottom-nav";
import { shellHeaderHeightClass } from "@/components/layout/shell-header";
import { resolveActiveGameInviteCode } from "@/lib/active-game";
import { getUserGamesState } from "@/lib/game-access";
import { cn } from "@/lib/utils";
import { userNeedsEmailVerification } from "@/lib/email-verification";
import { isSuperadmin } from "@/lib/roles";
import type { SessionUser } from "@/lib/auth";

export async function AppShell({
  children,
  user,
  gameInviteCode,
  isPlatformAdmin,
  canManageGame = false,
  gameOversightMode = false,
  hasGamesOrOversight,
  skipEmailVerification = false,
}: {
  children: React.ReactNode;
  user: SessionUser | null;
  gameInviteCode?: string;
  isPlatformAdmin?: boolean;
  canManageGame?: boolean;
  /** Суперадмин смотрит чужой турнир без участия */
  gameOversightMode?: boolean;
  /** Показать навигацию по игре (участник или надзор) */
  hasGamesOrOversight?: boolean;
  /** Страница подтверждения почты — без редиректа */
  skipEmailVerification?: boolean;
}) {
  if (user && !skipEmailVerification && userNeedsEmailVerification(user)) {
    redirect("/verify-email");
  }

  const userIsPlatformAdmin = isPlatformAdmin ?? (user ? isSuperadmin(user.role) : false);

  let hasGames = false;
  let activeInviteCode = gameInviteCode;

  if (user) {
    const state = await getUserGamesState(user.id);
    hasGames = state.hasGames;
    const pathname = (await headers()).get("x-pathname") ?? "";
    activeInviteCode = await resolveActiveGameInviteCode(user.id, {
      preferredInviteCode: gameInviteCode,
      pathname,
      fallbackInviteCode: state.firstInviteCode,
    });
  }

  const showGameNav = hasGamesOrOversight ?? hasGames;
  const showMobileNav = Boolean(user);

  return (
    <div className="relative h-dvh overflow-hidden bg-brand-bg text-white">
      <div
        className="brand-dot-pattern pointer-events-none absolute inset-0 opacity-10"
        aria-hidden="true"
      />

      <div className="relative flex h-full min-h-0 min-w-0 max-w-full">
        {user ? (
          <DesktopSidebar
            gameInviteCode={activeInviteCode}
            hasGames={showGameNav}
            isPlatformAdmin={userIsPlatformAdmin}
            canManageGame={canManageGame}
            gameOversightMode={gameOversightMode}
          />
        ) : null}
        <div className="flex h-full min-h-0 min-w-0 max-w-full flex-1 flex-col">
          <header
            className={cn(
              shellHeaderHeightClass,
              "z-40 flex shrink-0 items-center border-b border-brand-neutral bg-brand-bg/90 py-3 backdrop-blur md:py-0",
            )}
          >
            <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 md:px-6">
              <div className="flex min-w-0 flex-1 items-center gap-4 overflow-visible">
                <div className={user ? "md:hidden" : ""}>
                  <BrandLogo size="sm" />
                </div>
                {user ? <ShellDesktopPageTitle /> : null}
              </div>
              <div className="flex shrink-0 items-center gap-3">
                {user ? (
                  <>
                    <div className="hidden items-center gap-2 overflow-visible sm:flex">
                      <Link
                        href="/profile"
                        className="flex items-center gap-2 overflow-visible rounded-lg py-1 pr-1 transition-colors hover:text-white"
                      >
                        <span className="relative inline-flex shrink-0">
                          <UserAvatar
                            name={user.name}
                            avatarUrl={user.avatarUrl}
                            size="sm"
                          />
                          {userIsPlatformAdmin ? (
                            <>
                              <IconCrown
                                className="pointer-events-none absolute top-0 left-1/2 z-10 size-3.5 -translate-x-1/2 translate-y-[-88%] text-brand-lime"
                                stroke={1.75}
                                aria-hidden
                              />
                              <span className="sr-only">Суперадмин</span>
                            </>
                          ) : null}
                        </span>
                        <span className="text-sm text-brand-muted hover:text-white">
                          {user.name}
                        </span>
                      </Link>
                    </div>
                  </>
                ) : (
                  <Link href="/">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-auto min-h-0 px-2 py-1 text-sm font-medium text-brand-muted hover:text-white"
                    >
                      Войти
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          </header>
          <main
            className={cn(
              "min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden md:pb-6",
              showMobileNav &&
                "pb-[calc(5.25rem+env(safe-area-inset-bottom,0px))]",
            )}
          >
            {children}
          </main>
        </div>
      </div>
      {showMobileNav ? (
        <MobileBottomNav
          gameInviteCode={activeInviteCode}
          gameOversightMode={gameOversightMode}
          hasGames={showGameNav}
        />
      ) : null}
    </div>
  );
}
