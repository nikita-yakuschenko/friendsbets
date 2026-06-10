export const ADMIN_TAB_IDS = [
  "users",
  "notifications",
  "tournaments",
  "games",
  "matches",
  "integrations",
] as const;

export type AdminTabId = (typeof ADMIN_TAB_IDS)[number];

export const ADMIN_TABS: { id: AdminTabId; label: string }[] = [
  { id: "users", label: "Пользователи" },
  { id: "notifications", label: "Уведомления" },
  { id: "tournaments", label: "Турниры и шаблоны" },
  { id: "games", label: "Игры" },
  { id: "matches", label: "Матчи и результаты" },
  { id: "integrations", label: "API и интеграции" },
];

/** Вкладки организатора турнира (без платформенных разделов). */
export const ORGANIZER_ADMIN_TAB_IDS: AdminTabId[] = [
  "tournaments",
  "games",
];

export function getAdminTabsForUser(isSuperadmin: boolean) {
  if (isSuperadmin) return ADMIN_TABS;
  return ADMIN_TABS.filter((tab) => ORGANIZER_ADMIN_TAB_IDS.includes(tab.id));
}

export function parseAdminTab(
  raw: string | undefined,
  isSuperadmin: boolean,
): AdminTabId {
  const allowed = getAdminTabsForUser(isSuperadmin).map((tab) => tab.id);
  if (raw && allowed.includes(raw as AdminTabId)) {
    return raw as AdminTabId;
  }
  return allowed[0] ?? "games";
}
