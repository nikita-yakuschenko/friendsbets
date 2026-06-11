/** Мобильные браузеры и in-app WebView часто блокируют window.open после async. */
export function isMobileTelegramLinkContext(): boolean {
  if (typeof navigator === "undefined") return false;
  return /Android|iPhone|iPad|iPod|webOS|Mobile/i.test(navigator.userAgent);
}

/**
 * Открывает t.me/?start=… — на телефоне переход в приложение Telegram,
 * на десктопе новая вкладка с fallback на тот же переход.
 */
export function openTelegramDeepLink(url: string): void {
  if (isMobileTelegramLinkContext()) {
    window.location.assign(url);
    return;
  }

  const popup = window.open(url, "_blank", "noopener,noreferrer");
  if (!popup) {
    window.location.assign(url);
  }
}
