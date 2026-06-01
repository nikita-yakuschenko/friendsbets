import Link from "next/link";
import { IconCrown } from "@tabler/icons-react";
import { UserAvatar } from "@/components/user/user-avatar";
import { logoutAction } from "@/server/actions/auth";
import { BrandLogo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { UserRoleBadge } from "@/components/user/user-role-badge";
import { DesktopSidebar } from "@/components/layout/desktop-sidebar";
import { ShellDesktopPageTitle } from "@/components/layout/shell-desktop-page-title";
import { MobileBottomNav } from "@/components/layout/mobile-bottom-nav";
import { shellHeaderHeightClass } from "@/components/layout/shell-header";
import { getUserGamesState } from "@/lib/game-access";
import { cn } from "@/lib/utils";
import { isAdmin } from "@/lib/roles";
import type { SessionUser } from "@/lib/auth";

export async function AppShell({
  children,
  user,
  gameInviteCode,
  isPlatformAdmin,
  canManageGame = false,
}: {
  children: React.ReactNode;
  user: SessionUser | null;
  gameInviteCode?: string;
  isPlatformAdmin?: boolean;
  canManageGame?: boolean;
}) {
  const userIsPlatformAdmin = isPlatformAdmin ?? (user ? isAdmin(user.role) : false);

  let hasGames = false;
  let activeInviteCode = gameInviteCode;

  if (user) {
    const state = await getUserGamesState(user.id);
    hasGames = state.hasGames;
    if (!activeInviteCode && state.firstInviteCode) {
      activeInviteCode = state.firstInviteCode;
    }
  }

  const showMobileNav = Boolean(user && hasGames && activeInviteCode);

  return (
    <div className="relative min-h-screen bg-brand-bg text-white">
      <div
        className="brand-dot-pattern pointer-events-none absolute inset-0 opacity-10"
        aria-hidden="true"
      />

      <div className="relative flex min-h-screen min-w-0">
        {user ? (
          <DesktopSidebar
            gameInviteCode={activeInviteCode}
            hasGames={hasGames}
            isPlatformAdmin={userIsPlatformAdmin}
            canManageGame={canManageGame}
          />
        ) : null}
        <div className="flex min-h-screen min-w-0 flex-1 flex-col">
          <header
            className={cn(
              shellHeaderHeightClass,
              "sticky top-0 z-40 flex items-center border-b border-brand-neutral bg-brand-bg/90 py-3 backdrop-blur md:py-0",
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
                    <div className="hidden items-center gap-2 sm:flex">
                      <Link
                        href="/profile"
                        className="flex items-center gap-2 rounded-lg py-1 pr-1 transition-colors hover:text-white"
                      >
                        <UserAvatar
                          name={user.name}
                          avatarUrl={user.avatarUrl}
                          size="sm"
                        />
                        <span className="text-sm text-brand-muted hover:text-white">
                          {user.name}
                        </span>
                      </Link>
                      {userIsPlatformAdmin ? (
                        <IconCrown
                          className="h-4 w-4 shrink-0 text-brand-lime"
                          stroke={1.75}
                          aria-label="Администратор"
                        />
                      ) : (
                        <UserRoleBadge role={user.role} />
                      )}
                    </div>
                    <form action={logoutAction}>
                      <Button
                        type="submit"
                        variant="ghost"
                        size="sm"
                        className="h-auto min-h-0 px-2 py-1 text-sm font-medium text-brand-muted hover:text-white"
                      >
                        Выйти
                      </Button>
                    </form>
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
              "min-w-0 flex-1 overflow-x-hidden",
              showMobileNav && "pb-24 md:pb-6",
            )}
          >
            {children}
          </main>
        </div>
      </div>
      {showMobileNav && activeInviteCode ? (
        <MobileBottomNav gameInviteCode={activeInviteCode} />
      ) : null}
    </div>
  );
}
