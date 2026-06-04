"use client";

import { IconCopy } from "@tabler/icons-react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { buildInvitePath } from "@/lib/invite-url";
import { cn } from "@/lib/utils";

const COPIED_FEEDBACK_MS = 1600;

export function InviteCodeCopyCell({
  inviteCode,
  inviteLinkUrl,
  compact = false,
}: {
  inviteCode: string;
  inviteLinkUrl: string;
  /** Компактная строка рядом с подписью (карточки турниров). */
  compact?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  function resolveInviteLinkUrl(): string {
    if (typeof window !== "undefined") {
      const origin = window.location.origin.replace(/\/$/, "");
      return `${origin}${buildInvitePath(inviteCode)}`;
    }
    return inviteLinkUrl;
  }

  async function handleCopy() {
    const url = resolveInviteLinkUrl();
    try {
      await navigator.clipboard.writeText(url);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      setCopied(true);
      timeoutRef.current = setTimeout(() => setCopied(false), COPIED_FEEDBACK_MS);
      toast.success("Ссылка приглашения скопирована");
    } catch {
      toast.error("Не удалось скопировать ссылку");
    }
  }

  const transition = reduceMotion
    ? { duration: 0 }
    : { duration: 0.22, ease: [0.22, 1, 0.36, 1] as const };

  return (
    <div
      className={cn(
        "inline-flex items-center",
        compact ? "h-5 min-w-0" : "h-11 min-w-38",
      )}
    >
      <AnimatePresence mode="wait" initial={false}>
        {copied ? (
          <motion.span
            key="copied"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={transition}
            className={cn(
              "flex items-center text-sm font-medium text-brand-lime",
              compact ? "h-5" : "h-11",
            )}
            aria-live="polite"
          >
            Скопировано
          </motion.span>
        ) : (
          <motion.button
            key="default"
            type="button"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={transition}
            onClick={handleCopy}
            aria-label={`Скопировать ссылку приглашения, код ${inviteCode}`}
            className={cn(
              "-mx-1 flex items-center gap-2 rounded-lg px-1 text-left",
              compact ? "h-5 min-w-0 py-0" : "h-11 min-w-38 px-2",
              "transition-colors hover:text-brand-lime active:text-brand-lime",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-lime/60",
            )}
          >
            <span className="text-sm">{inviteCode}</span>
            <IconCopy
              className="size-[18px] shrink-0 stroke-[1.75] text-brand-muted"
              aria-hidden
            />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
