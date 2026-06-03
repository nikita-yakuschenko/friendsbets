"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { IconCirclePlus, IconPlus, IconUserPlus } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const items = [
  { href: "/create", label: "Создать турнир", icon: IconCirclePlus },
  { href: "/join", label: "Добавить турнир", icon: IconUserPlus },
] as const;

export function TournamentsAddMenu() {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative shrink-0">
      <Button
        type="button"
        variant="secondary"
        size="icon"
        className="size-10 shrink-0 rounded-xl"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Добавить или создать турнир"
        onClick={() => setOpen((value) => !value)}
      >
        <IconPlus className="size-5 shrink-0 text-white" stroke={1.75} aria-hidden />
      </Button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-2 min-w-50 overflow-hidden rounded-xl border border-brand-neutral bg-brand-surface py-1 shadow-lg"
        >
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                role="menuitem"
                className={cn(
                  "flex items-center gap-2.5 px-3 py-2.5 text-sm text-white transition-colors",
                  "hover:bg-brand-neutral/40",
                )}
                onClick={() => setOpen(false)}
              >
                <Icon className="size-4 shrink-0 text-brand-lime" stroke={1.75} />
                {item.label}
              </Link>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
