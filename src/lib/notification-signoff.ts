export const NOTIFICATION_SIGNOFF = "Твоя команда FriendsBets 💚";

export function bodyHasNotificationSignoff(
  text: string | null | undefined,
): boolean {
  if (!text) return false;
  return text.trimEnd().endsWith(NOTIFICATION_SIGNOFF);
}

/** Добавляет подпись в конец текста (идемпотентно). */
export function withNotificationSignoff(text: string): string {
  const trimmed = text.trimEnd();
  if (bodyHasNotificationSignoff(trimmed)) return trimmed;
  return `${trimmed}\n\n${NOTIFICATION_SIGNOFF}`;
}
