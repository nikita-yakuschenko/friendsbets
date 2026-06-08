"use client";

import {
  IconChevronDown,
  IconMessages,
} from "@tabler/icons-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import { useNotificationUnread } from "@/components/notifications/notification-unread-provider";
import { gamePath } from "@/lib/game-path";
import type { NotificationListItem } from "@/lib/notifications";
import { formatNotificationMessage } from "@/lib/notification-preview";
import { PREDICTION_CTA_LABEL } from "@/lib/prediction-reminder-content";
import {
  GAME_JOIN_REQUEST_STATUS,
  USER_NOTIFICATION_KIND,
} from "@/lib/notification-types";
import { respondToJoinRequestAction } from "@/server/actions/join-request";
import {
  markAllNotificationsReadAction,
  markNotificationReadAction,
} from "@/server/actions/notifications";
import { NotificationSignoff } from "@/components/notifications/notification-signoff";
import { bodyHasNotificationSignoff } from "@/lib/notification-signoff";
import { cn } from "@/lib/utils";

type InboxTab = "new" | "read";

function formatWhen(iso: string) {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

function notificationPreview(item: NotificationListItem): string {
  return formatNotificationMessage({
    kind: item.kind,
    applicantName: item.joinRequest?.user.name,
    gameTitle: item.joinRequest?.game.title,
    broadcastTitle: item.title,
  });
}

function effectiveReadAt(
  item: NotificationListItem,
  overrides: Record<string, string>,
): string | null {
  return overrides[item.id] ?? item.readAt;
}

function NotificationShell({
  item,
  readAt,
  expanded,
  preview,
  onToggle,
  children,
}: {
  item: NotificationListItem;
  readAt: string | null;
  expanded: boolean;
  preview: string;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  const unread = !readAt;

  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border bg-brand-surface/40 transition-colors",
        unread ? "border-brand-lime/35" : "border-brand-neutral/60",
      )}
    >
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-start gap-2 px-4 py-3 text-left"
        aria-expanded={expanded}
      >
        {unread ? (
          <span
            className="mt-2 size-2 shrink-0 rounded-full bg-brand-lime"
            aria-hidden
          />
        ) : (
          <span className="mt-2 size-2 shrink-0" aria-hidden />
        )}
        <span className="min-w-0 flex-1">
          <span className="block text-xs text-brand-muted">
            {formatWhen(item.createdAt)}
          </span>
          <span
            className={cn(
              "mt-0.5 block text-sm text-white",
              expanded ? "font-medium" : "line-clamp-2",
            )}
          >
            {preview}
          </span>
        </span>
        <IconChevronDown
          className={cn(
            "mt-1 size-4 shrink-0 text-brand-muted transition-transform",
            expanded && "rotate-180",
          )}
          aria-hidden
        />
      </button>
      {expanded ? (
        <div className="space-y-3 border-t border-brand-neutral/60 px-4 py-3 text-sm text-white">
          {children}
        </div>
      ) : null}
    </div>
  );
}

function JoinRequestReceivedBody({
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
    <>
      <p>
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
      <NotificationSignoff />
    </>
  );
}

function NotificationRow({
  item,
  readAt,
  expanded,
  onToggle,
}: {
  item: NotificationListItem;
  readAt: string | null;
  expanded: boolean;
  onToggle: () => void;
}) {
  const preview = notificationPreview(item);

  if (
    item.kind === USER_NOTIFICATION_KIND.JOIN_REQUEST_RECEIVED &&
    item.joinRequest
  ) {
    return (
      <NotificationShell
        item={item}
        readAt={readAt}
        expanded={expanded}
        preview={preview}
        onToggle={onToggle}
      >
        <JoinRequestReceivedBody
          item={
            item as NotificationListItem & {
              joinRequest: NonNullable<NotificationListItem["joinRequest"]>;
            }
          }
        />
      </NotificationShell>
    );
  }

  if (
    item.kind === USER_NOTIFICATION_KIND.MISSING_PREDICTION ||
    item.kind === USER_NOTIFICATION_KIND.MATCH_RESULT
  ) {
    const predictionsHref = item.actionInviteCode
      ? gamePath(item.actionInviteCode, "predictions")
      : null;
    const leaderboardHref = item.actionInviteCode
      ? gamePath(item.actionInviteCode, "leaderboard")
      : null;

    return (
      <NotificationShell
        item={item}
        readAt={readAt}
        expanded={expanded}
        preview={preview}
        onToggle={onToggle}
      >
        <p className="whitespace-pre-wrap text-brand-muted">{item.body}</p>
        {!bodyHasNotificationSignoff(item.body) ? <NotificationSignoff /> : null}
        <div className="mt-1 flex flex-wrap gap-2">
          {leaderboardHref && item.kind === USER_NOTIFICATION_KIND.MATCH_RESULT ? (
            <Link
              href={leaderboardHref}
              className={cn(buttonVariants({ size: "sm", variant: "outline" }), "w-fit")}
            >
              Таблица
            </Link>
          ) : null}
          {predictionsHref ? (
            <Link
              href={predictionsHref}
              className={cn(buttonVariants({ size: "sm" }), "w-fit")}
            >
              {PREDICTION_CTA_LABEL}
            </Link>
          ) : null}
        </div>
      </NotificationShell>
    );
  }

  if (item.kind === USER_NOTIFICATION_KIND.PLATFORM_BROADCAST) {
    return (
      <NotificationShell
        item={item}
        readAt={readAt}
        expanded={expanded}
        preview={preview}
        onToggle={onToggle}
      >
        <p className="font-medium">{item.title ?? "FriendsBets"}</p>
        <p className="whitespace-pre-wrap text-brand-muted">{item.body}</p>
        {!bodyHasNotificationSignoff(item.body) ? <NotificationSignoff /> : null}
      </NotificationShell>
    );
  }

  if (!item.joinRequest) return null;

  const { joinRequest } = item;

  if (item.kind === USER_NOTIFICATION_KIND.JOIN_REQUEST_APPROVED) {
    return (
      <NotificationShell
        item={item}
        readAt={readAt}
        expanded={expanded}
        preview={preview}
        onToggle={onToggle}
      >
        <p>
          Вас приняли в турнир «{joinRequest.game.title}».{" "}
          <Link
            href={gamePath(joinRequest.game.inviteCode)}
            className="font-medium text-brand-lime hover:underline"
          >
            Открыть турнир
          </Link>
        </p>
        <NotificationSignoff />
      </NotificationShell>
    );
  }

  if (item.kind === USER_NOTIFICATION_KIND.JOIN_REQUEST_REJECTED) {
    return (
      <NotificationShell
        item={item}
        readAt={readAt}
        expanded={expanded}
        preview={preview}
        onToggle={onToggle}
      >
        <p>
          Организатор отклонил вашу заявку на вступление в турнир «
          {joinRequest.game.title}».
        </p>
        <NotificationSignoff />
      </NotificationShell>
    );
  }

  return null;
}

export function NotificationList({ items }: { items: NotificationListItem[] }) {
  const router = useRouter();
  const { refreshUnread } = useNotificationUnread();
  const [tab, setTab] = useState<InboxTab>("new");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [readOverrides, setReadOverrides] = useState<Record<string, string>>(
    {},
  );
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setExpandedId(null);
  }, [tab]);

  const { unreadItems, readItems } = useMemo(() => {
    const unread: NotificationListItem[] = [];
    const read: NotificationListItem[] = [];
    for (const item of items) {
      if (effectiveReadAt(item, readOverrides)) {
        read.push(item);
      } else {
        unread.push(item);
      }
    }
    return { unreadItems: unread, readItems: read };
  }, [items, readOverrides]);

  const visible = tab === "new" ? unreadItems : readItems;

  function markReadLocally(id: string) {
    setReadOverrides((prev) => ({
      ...prev,
      [id]: new Date().toISOString(),
    }));
  }

  function handleToggle(id: string) {
    if (expandedId === id) {
      setExpandedId(null);
      return;
    }

    setExpandedId(id);
    const item = items.find((row) => row.id === id);
    if (!item || effectiveReadAt(item, readOverrides)) return;

    markReadLocally(id);
    startTransition(async () => {
      const result = await markNotificationReadAction(id);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      router.refresh();
      await refreshUnread();
    });
  }

  function handleMarkAllRead() {
    const unreadIds = unreadItems.map((item) => item.id);
    if (unreadIds.length === 0) return;

    const now = new Date().toISOString();
    setReadOverrides((prev) => {
      const next = { ...prev };
      for (const id of unreadIds) next[id] = now;
      return next;
    });
    setExpandedId(null);
    setTab("read");

    startTransition(async () => {
      const result = await markAllNotificationsReadAction();
      if (result.error) {
        toast.error(result.error);
        return;
      }
      router.refresh();
      await refreshUnread();
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <nav
          className="flex min-w-0 flex-1 flex-nowrap gap-1 overflow-x-auto rounded-xl border border-brand-neutral bg-brand-surface/50 p-1 scrollbar-none"
          aria-label="Разделы уведомлений"
        >
          <button
            type="button"
            onClick={() => setTab("new")}
            className={cn(
              "shrink-0 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              tab === "new"
                ? "bg-brand-lime text-black"
                : "text-brand-muted hover:bg-brand-neutral/30 hover:text-white",
            )}
            aria-current={tab === "new" ? "true" : undefined}
          >
            Новые
            <span
              className={cn(
                "ml-1.5 tabular-nums",
                tab === "new" ? "text-black/70" : "text-brand-muted",
              )}
            >
              ({unreadItems.length})
            </span>
          </button>
          <button
            type="button"
            onClick={() => setTab("read")}
            className={cn(
              "shrink-0 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              tab === "read"
                ? "bg-brand-lime text-black"
                : "text-brand-muted hover:bg-brand-neutral/30 hover:text-white",
            )}
            aria-current={tab === "read" ? "true" : undefined}
          >
            Прочитанные
            <span
              className={cn(
                "ml-1.5 tabular-nums",
                tab === "read" ? "text-black/70" : "text-brand-muted",
              )}
            >
              ({readItems.length})
            </span>
          </button>
        </nav>

        <button
          type="button"
          onClick={handleMarkAllRead}
          disabled={unreadItems.length === 0 || pending}
          className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl border border-brand-neutral text-brand-muted transition-colors hover:border-brand-lime/40 hover:bg-brand-lime/10 hover:text-brand-lime disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="Отметить всё прочитанным"
          title="Отметить всё прочитанным"
        >
          <IconMessages className="size-5" stroke={1.75} aria-hidden />
        </button>
      </div>

      {visible.length === 0 ? (
        <p className="rounded-xl border border-brand-neutral px-4 py-10 text-center text-sm text-brand-muted">
          {tab === "new"
            ? "Нет новых уведомлений."
            : "Прочитанных уведомлений пока нет."}
        </p>
      ) : (
        <ul className="space-y-3">
          {visible.map((item) => (
            <li key={item.id}>
              <NotificationRow
                item={item}
                readAt={effectiveReadAt(item, readOverrides)}
                expanded={expandedId === item.id}
                onToggle={() => handleToggle(item.id)}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
