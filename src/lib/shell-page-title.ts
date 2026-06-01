/** Desktop shell header title by route. `null` = title stays in page body (game home). */
export function resolveDesktopHeaderTitle(pathname: string): string | null {
  if (pathname === "/") return "Мои турниры";
  if (pathname === "/profile") return "Профиль";
  if (pathname === "/join") return "Подключиться";
  if (pathname === "/create") return "Создать турнир";
  if (pathname.startsWith("/create/success")) return "Турнир создан";
  if (pathname.startsWith("/admin/missing")) return "Кто не поставил";
  if (pathname === "/admin") return "Админка";

  const gameSubpage = pathname.match(/^\/game\/[^/]+\/([^/]+)\/?$/);
  if (gameSubpage) {
    const titles: Record<string, string> = {
      predictions: "Мои прогнозы",
      leaderboard: "Таблица",
      live: "Лайв",
      more: "Ещё",
    };
    return titles[gameSubpage[1]] ?? null;
  }

  if (/^\/game\/[^/]+\/?$/.test(pathname)) {
    return null;
  }

  return null;
}

export function isGameHomePath(pathname: string): boolean {
  return /^\/game\/[^/]+\/?$/.test(pathname);
}
