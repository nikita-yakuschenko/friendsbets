"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { gamePath } from "@/lib/game-path";
import type { NotificationListItem } from "@/lib/notifications";
import {
  GAME_JOIN_REQUEST_STATUS,
  USER_NOTIFICATION_KIND,
} from "@/lib/notification-types";
import { useNotificationUnread } from "@/components/notifications/notification-unread-provider";
import { respondToJoinRequestAction } from "@/server/actions/join-request";
import Link from "next/link";

function formatWhen(iso: string) {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

function JoinRequestReceivedCard({
  item,
}: {
  item: NotificationListItem & {
    joinRequest: NonNullable<NotificationListItem["joinRequest"]>;
  };
}) {
  const router = useRouter();
  const { refreshUnread } = useNotificationUnread();
  const [pending, startTransition] = useTransition();
  const { joinRequest } = item;
  const isPending = joinRequest.status === GAME_JOIN_REQUEST_STATUS.PENDING;

  function respond(decision: "approve" | "reject") {
    startTransition(async () => {
      const result = await respondToJoinRequestAction(joinRequest.id, decision);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success(result.message ?? "Готово");
      router.refresh();
      await refreshUnread();
    });
  }

  return (
    <Card
      className={
        item.readAt ? "border-brand-neutral/60" : "border-brand-lime/40"
      }
    >
      <CardContent className="space-y-3 py-4">
        <p className="text-xs text-brand-muted">{formatWhen(item.createdAt)}</p>
        <p className="text-sm text-white">
          <span className="font-medium">{joinRequest.user.name}</span> хочет
          вступить в турнир{" "}
          <span className="font-medium">«{joinRequest.game.title}»</span>
        </p>
        {isPending ? (
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              disabled={pending}
              onClick={() => respond("approve")}
            >
              {pending ? "…" : "Принять"}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={pending}
              onClick={() => respond("reject")}
            >
              Отказать
            </Button>
          </div>
        ) : (
          <p className="text-xs text-brand-muted">
            {joinRequest.status === GAME_JOIN_REQUEST_STATUS.APPROVED
              ? "Заявка принята"
              : "Заявка отклонена"}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function NotificationMessageCard({
  item,
  children,
}: {
  item: NotificationListItem;
  children: React.ReactNode;
}) {
  return (
    <Card
      className={
        item.readAt ? "border-brand-neutral/60" : "border-brand-cyan/30"
      }
    >
      <CardContent className="space-y-2 py-4">
        <p className="text-xs text-brand-muted">{formatWhen(item.createdAt)}</p>
        <p className="text-sm text-white">{children}</p>
      </CardContent>
    </Card>
  );
}

export function NotificationList({ items }: { items: NotificationListItem[] }) {
  if (items.length === 0) {
    return (
      <p className="rounded-xl border border-brand-neutral px-4 py-10 text-center text-sm text-brand-muted">
        Пока нет уведомлений.
      </p>
    );
  }

  return (
    <ul className="space-y-3">
      {items.map((item) => {
        if (
          item.kind === USER_NOTIFICATION_KIND.JOIN_REQUEST_RECEIVED &&
          item.joinRequest
        ) {
          return (
            <li key={item.id}>
              <JoinRequestReceivedCard
                item={
                  item as NotificationListItem & {
                    joinRequest: NonNullable<NotificationListItem["joinRequest"]>;
                  }
                }
              />
            </li>
          );
        }

        if (!item.joinRequest) {
          return null;
        }

        const { joinRequest } = item;

        if (item.kind === USER_NOTIFICATION_KIND.JOIN_REQUEST_APPROVED) {
          return (
            <li key={item.id}>
              <NotificationMessageCard item={item}>
                Вас приняли в турнир «{joinRequest.game.title}».{" "}
                <Link
                  href={gamePath(joinRequest.game.inviteCode)}
                  className="font-medium text-brand-lime hover:underline"
                >
                  Открыть турнир
                </Link>
              </NotificationMessageCard>
            </li>
          );
        }

        if (item.kind === USER_NOTIFICATION_KIND.JOIN_REQUEST_REJECTED) {
          return (
            <li key={item.id}>
              <NotificationMessageCard item={item}>
                Организатор отклонил вашу заявку на вступление в турнир «
                {joinRequest.game.title}».
              </NotificationMessageCard>
            </li>
          );
        }

        return null;
      })}
    </ul>
  );
}
