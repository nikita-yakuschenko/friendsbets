/** Первая строка турнирных in-app / Telegram / email-текстов. */
export function formatTournamentNotificationLead(gameTitle: string): string {
  const title = gameTitle.trim();
  if (!title) return "";
  return `В турнире «${title}»`;
}

export function withTournamentNotificationLead(
  gameTitle: string,
  lines: string[],
): string[] {
  const lead = formatTournamentNotificationLead(gameTitle);
  if (!lead) return lines;
  return [lead, "", ...lines];
}

export function joinTournamentNotificationBody(
  gameTitle: string,
  lines: string[],
): string {
  return withTournamentNotificationLead(gameTitle, lines).join("\n");
}
