"use client";

import { IconInfoCircle } from "@tabler/icons-react";
import { useId, useState } from "react";
import { cn } from "@/lib/utils";

/** Краткая подсказка по клику на иконку (без длинного текста в интерфейсе). */
export function InfoHint({
  title = "Подробнее",
  children,
  className,
}: {
  title?: string;
  children: React.ReactNode;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const panelId = useId();

  return (
    <span className={cn("relative inline-flex", className)}>
      <button
        type="button"
        className="inline-flex size-7 shrink-0 items-center justify-center rounded-full text-brand-muted transition-colors hover:bg-brand-neutral/40 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-lime"
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={title}
        onClick={() => setOpen((v) => !v)}
      >
        <IconInfoCircle className="size-4" stroke={1.75} aria-hidden />
      </button>
      {open ? (
        <div
          id={panelId}
          role="tooltip"
          className="absolute top-full right-0 z-20 mt-2 w-[min(18rem,calc(100vw-2rem))] rounded-lg border border-brand-neutral bg-brand-surface px-3 py-2 text-left text-xs leading-relaxed text-brand-muted shadow-lg"
        >
          {children}
        </div>
      ) : null}
    </span>
  );
}
