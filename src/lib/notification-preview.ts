import type { UserNotificationKindValue } from "@/lib/notification-types";
import { USER_NOTIFICATION_KIND } from "@/lib/notification-types";
import { gamePath } from "@/lib/game-path";

export type UnreadNotificationPreview = {
  id: string;
  kind: UserNotificationKindValue;
  message: string;
  href: string;
};

export function formatNotificationMessage(input: {
  kind: UserNotificationKindValue;
  applicantName?: string;
  gameTitle?: string;
}): string {
  const { kind, applicantName, gameTitle } = input;
  const game = gameTitle ? `«${gameTitle}»` : "турнир";

  switch (kind) {
    case USER_NOTIFICATION_KIND.JOIN_REQUEST_RECEIVED:
      return `${applicantName ?? "Участник"} хочет вступить в ${game}`;
    case USER_NOTIFICATION_KIND.JOIN_REQUEST_APPROVED:
      return `Вас приняли в ${game}`;
    case USER_NOTIFICATION_KIND.JOIN_REQUEST_REJECTED:
      return `Заявку в ${game} отклонили`;
    default:
      return "Новое уведомление";
  }
}

export function notificationHref(inviteCode: string): string {
  return gamePath(inviteCode, "more/notifications");
}
