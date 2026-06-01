"use client";

import { IconCopy } from "@tabler/icons-react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const COPIED_FEEDBACK_MS = 1600;

export function InviteCodeCopyCell({
  inviteCode,
  inviteLinkUrl,
}: {
  inviteCode: string;
  inviteLinkUrl: string;
}) {
  const [copied, setCopied] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(inviteLinkUrl);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      setCopied(true);
      timeoutRef.current = setTimeout(() => setCopied(false), COPIED_FEEDBACK_MS);
    } catch {
      toast.error("Не удалось скопировать ссылку");
    }
  }

  const transition = reduceMotion
    ? { duration: 0 }
    : { duration: 0.22, ease: [0.22, 1, 0.36, 1] as const };

  return (
    <div className="inline-flex h-11 items-center min-w-38">
      <AnimatePresence mode="wait" initial={false}>
        {copied ? (
          <motion.span
            key="copied"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={transition}
            className="flex h-11 items-center text-sm font-medium text-brand-lime"
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
              "-mx-1 flex h-11 items-center gap-2 min-w-38 rounded-lg px-2 text-left",
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
