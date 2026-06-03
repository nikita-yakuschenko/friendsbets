"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";
import type { UnreadNotificationSnapshot } from "@/lib/notifications";

const POLL_MS = 15_000;

type NotificationUnreadContextValue = {
  unreadCount: number;
  refreshUnread: () => Promise<void>;
};

const NotificationUnreadContext =
  createContext<NotificationUnreadContextValue | null>(null);

export function useNotificationUnread(): NotificationUnreadContextValue {
  const ctx = useContext(NotificationUnreadContext);
  if (!ctx) {
    return {
      unreadCount: 0,
      refreshUnread: async () => {},
    };
  }
  return ctx;
}

export function NotificationUnreadProvider({
  initialCount,
  enabled,
  children,
}: {
  initialCount: number;
  enabled: boolean;
  children: ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [unreadCount, setUnreadCount] = useState(initialCount);
  const prevCountRef = useRef(initialCount);
  const toastedIdsRef = useRef<Set<string>>(new Set());
  const pollingReadyRef = useRef(false);

  const applySnapshot = useCallback(
    (data: UnreadNotificationSnapshot, options?: { allowToast?: boolean }) => {
      const prevCount = prevCountRef.current;
      prevCountRef.current = data.count;
      setUnreadCount(data.count);

      const onNotificationsPage = /\/more\/notifications\/?$/.test(pathname);
      const allowToast = options?.allowToast ?? true;
      const increased = data.count > prevCount;

      if (!allowToast || !pollingReadyRef.current) {
        if (data.latest) {
          toastedIdsRef.current.add(data.latest.id);
        }
        return;
      }

      if (
        onNotificationsPage ||
        !increased ||
        !data.latest ||
        toastedIdsRef.current.has(data.latest.id)
      ) {
        return;
      }

      toastedIdsRef.current.add(data.latest.id);

      toast.info(data.latest.message, {
        id: `notification-${data.latest.id}`,
        duration: 6500,
        description:
          data.count > 1 ? `Всего непрочитанных: ${data.count}` : undefined,
        action: {
          label: "Открыть",
          onClick: () => router.push(data.latest!.href),
        },
      });

      router.refresh();
    },
    [pathname, router],
  );

  const fetchSnapshot = useCallback(
    async (options?: { allowToast?: boolean }) => {
      if (!enabled) return;

      try {
        const res = await fetch("/api/notifications/unread", {
          cache: "no-store",
        });
        if (!res.ok) return;
        const data = (await res.json()) as UnreadNotificationSnapshot;
        applySnapshot(data, options);
      } catch {
        // сеть недоступна — тихо пропускаем
      }
    },
    [applySnapshot, enabled],
  );

  useEffect(() => {
    setUnreadCount(initialCount);
    prevCountRef.current = initialCount;
  }, [initialCount]);

  useEffect(() => {
    void fetchSnapshot({ allowToast: false });
  }, [pathname, fetchSnapshot]);

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;

    void (async () => {
      await fetchSnapshot({ allowToast: false });
      if (!cancelled) pollingReadyRef.current = true;
    })();

    const interval = window.setInterval(() => {
      void fetchSnapshot({ allowToast: true });
    }, POLL_MS);

    const onFocus = () => void fetchSnapshot({ allowToast: true });
    window.addEventListener("focus", onFocus);

    return () => {
      cancelled = true;
      pollingReadyRef.current = false;
      window.clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, [enabled, fetchSnapshot]);

  const refreshUnread = useCallback(async () => {
    await fetchSnapshot({ allowToast: false });
  }, [fetchSnapshot]);

  return (
    <NotificationUnreadContext.Provider value={{ unreadCount, refreshUnread }}>
      {children}
    </NotificationUnreadContext.Provider>
  );
}
