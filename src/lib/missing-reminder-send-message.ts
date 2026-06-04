import type { MissingReminderChannel } from "@/lib/missing-prediction-reminder";

const CHANNEL_HINT: Record<MissingReminderChannel, string> = {
  email: "на почту",
  telegram: "в Telegram",
  inApp: "в уведомления на сайте",
  everywhere: "на сайте, в Telegram и на почту (где возможно)",
};

export function formatMissingReminderSendFeedback(
  result: {
    recipients: number;
    inApp: number;
    email: number;
    telegram: number;
    skipped: number;
  },
  channel: MissingReminderChannel,
): { error?: string; message?: string; detail?: string } {
  const delivered = result.inApp + result.email + result.telegram;
  const n = result.recipients;

  if (delivered === 0) {
    if (channel === "email" && result.skipped > 0) {
      return {
        error:
          n === 1
            ? "Письмо не отправлено: у участника не подтверждён email."
            : `Письмо не отправлено: у ${result.skipped} из ${n} нет подтверждённого email.`,
        detail: "Выберите «Уведомления», «Telegram» или «Везде».",
      };
    }
    if (channel === "telegram" && result.skipped > 0) {
      return {
        error: "В Telegram никому не отправили (бот недоступен или ошибка доставки).",
        detail: "Проверьте настройку бота или выберите «Уведомления».",
      };
    }
    return {
      error: "Никому не удалось доставить напоминание.",
      detail: `Канал: ${CHANNEL_HINT[channel]}.`,
    };
  }

  const parts: string[] = [];
  if (result.inApp > 0) {
    parts.push(
      result.inApp === 1
        ? "1 — в уведомления на сайте"
        : `${result.inApp} — в уведомления на сайте`,
    );
  }
  if (result.telegram > 0) {
    parts.push(
      result.telegram === 1
        ? "1 — в Telegram"
        : `${result.telegram} — в Telegram`,
    );
  }
  if (result.email > 0) {
    parts.push(
      result.email === 1 ? "1 — на почту" : `${result.email} — на почту`,
    );
  }

  const title =
    delivered === n
      ? `Напоминание отправлено ${delivered === 1 ? "1 участнику" : `${delivered} участникам`}`
      : `Напоминание: доставлено ${delivered} из ${n}`;

  let detail = parts.join(" · ");

  if (result.skipped > 0) {
    const skipNote =
      channel === "email" || channel === "everywhere"
        ? `${result.skipped} без подтверждённого email`
        : `${result.skipped} не доставлено`;
    detail = detail ? `${detail}. Не доставлено: ${skipNote}` : `Не доставлено: ${skipNote}`;
  }

  return { message: title, detail };
}
