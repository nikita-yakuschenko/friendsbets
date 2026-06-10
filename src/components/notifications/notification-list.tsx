"use client";

import { IconChevronDown } from "@tabler/icons-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
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

/** Считаем уведомление просмотренным после стольких мс в развёрнутом виде. */
const READ_AFTER_EXPAND_MS = 2500;

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
            title="Непрочитано"
            aria-label="Непрочитано"
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
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [readOverrides, setReadOverrides] = useState<Record<string, string>>(
    {},
  );
  const [pending, startTransition] = useTransition();
  const markingRef = useRef<Set<string>>(new Set());

  const unreadCount = useMemo(
    () =>
      items.filter((item) => !effectiveReadAt(item, readOverrides)).length,
    [items, readOverrides],
  );

  const commitMarkRead = useCallback(
    (id: string) => {
      if (markingRef.current.has(id)) return;

      const item = items.find((row) => row.id === id);
      if (!item || effectiveReadAt(item, readOverrides)) return;

      markingRef.current.add(id);
      const now = new Date().toISOString();
      setReadOverrides((prev) => ({ ...prev, [id]: now }));

      startTransition(async () => {
        const result = await markNotificationReadAction(id);
        if (result.error) {
          markingRef.current.delete(id);
          setReadOverrides((prev) => {
            const next = { ...prev };
            delete next[id];
            return next;
          });
          toast.error(result.error);
          return;
        }
        router.refresh();
        await refreshUnread();
      });
    },
    [items, readOverrides, refreshUnread, router],
  );

  useEffect(() => {
    if (!expandedId) return;

    const item = items.find((row) => row.id === expandedId);
    if (!item || effectiveReadAt(item, readOverrides)) return;

    const timer = window.setTimeout(() => {
      commitMarkRead(expandedId);
    }, READ_AFTER_EXPAND_MS);

    return () => window.clearTimeout(timer);
  }, [expandedId, items, readOverrides, commitMarkRead]);

  function handleToggle(id: string) {
    if (expandedId === id) {
      commitMarkRead(id);
      setExpandedId(null);
      return;
    }

    setExpandedId(id);
  }

  function handleMarkAllRead() {
    const unreadIds = items
      .filter((item) => !effectiveReadAt(item, readOverrides))
      .map((item) => item.id);
    if (unreadIds.length === 0) return;

    const now = new Date().toISOString();
    for (const id of unreadIds) markingRef.current.add(id);
    setReadOverrides((prev) => {
      const next = { ...prev };
      for (const id of unreadIds) next[id] = now;
      return next;
    });
    setExpandedId(null);

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
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-brand-muted">
          {unreadCount > 0
            ? `${unreadCount} непрочитанных — откройте, чтобы прочитать`
            : "Все уведомления просмотрены"}
        </p>
        {unreadCount > 0 ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={pending}
            onClick={handleMarkAllRead}
            className="shrink-0 text-brand-muted hover:text-brand-lime"
          >
            Прочитать все
          </Button>
        ) : null}
      </div>

      {items.length === 0 ? (
        <p className="rounded-xl border border-brand-neutral px-4 py-10 text-center text-sm text-brand-muted">
          Уведомлений пока нет.
        </p>
      ) : (
        <ul className="space-y-3">
          {items.map((item) => (
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
