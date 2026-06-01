export const ADMIN_TAB_IDS = [
  "tournaments",
  "games",
  "matches",
  "integrations",
] as const;

export type AdminTabId = (typeof ADMIN_TAB_IDS)[number];

export const ADMIN_TABS: { id: AdminTabId; label: string }[] = [
  { id: "tournaments", label: "Турниры и шаблоны" },
  { id: "games", label: "Игры" },
  { id: "matches", label: "Матчи и результаты" },
  { id: "integrations", label: "API и интеграции" },
];

export function parseAdminTab(raw?: string): AdminTabId {
  if (raw && ADMIN_TAB_IDS.includes(raw as AdminTabId)) {
    return raw as AdminTabId;
  }
  return "tournaments";
}
