/** Desktop shell header title by route. `null` = title stays in page body (game home). */
export function resolveDesktopHeaderTitle(pathname: string): string | null {
  if (pathname === "/") return "Мои турниры";
  if (pathname === "/profile") return "Профиль";
  if (pathname === "/notifications") return "Уведомления";
  if (pathname === "/join") return "Добавить турнир";
  if (pathname === "/add-tournament") return "Добавить турнир";
  if (pathname === "/create") return "Создать турнир";
  if (pathname.startsWith("/create/success")) return "Турнир создан";
  if (pathname.startsWith("/admin/missing")) return "Кто не поставил";
  if (pathname.startsWith("/admin/users/")) return "Пользователь";
  if (pathname === "/admin") return "Управление";

  if (/\/more\/notifications\/?$/.test(pathname)) {
    return "Уведомления";
  }

  if (/^\/game\/[^/]+\/live\/[^/]+\/?$/.test(pathname)) {
    return "Лайв";
  }

  const gameSubpage = pathname.match(/^\/game\/[^/]+\/([^/]+)\/?$/);
  if (gameSubpage) {
    const titles: Record<string, string> = {
      predictions: "Мои прогнозы",
      control: "Кто не поставил",
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

/** Маршруты вне /game/* — список турниров, профиль, создание и т.д. */
export function isHubShellPath(pathname: string): boolean {
  return !pathname.startsWith("/game/");
}
