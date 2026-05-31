"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

type CountdownParts = {
  days: string;
  hours: string;
  minutes: string;
  seconds: string;
};

const ROLL_MS = 480;

function parseCountdown(diffMs: number): CountdownParts {
  const totalSeconds = Math.max(0, Math.floor(diffMs / 1000));
  const pad = (value: number) => String(value).padStart(2, "0");

  return {
    days: pad(Math.floor(totalSeconds / 86400)),
    hours: pad(Math.floor((totalSeconds % 86400) / 3600)),
    minutes: pad(Math.floor((totalSeconds % 3600) / 60)),
    seconds: pad(totalSeconds % 60),
  };
}

function pluralRu(
  value: number,
  [one, few, many]: [string, string, string],
): string {
  const abs = Math.abs(value) % 100;
  const mod = abs % 10;
  if (abs >= 11 && abs <= 14) return many;
  if (mod === 1) return one;
  if (mod >= 2 && mod <= 4) return few;
  return many;
}

function CountdownColumn({
  value,
  label,
}: {
  value: string;
  label: string;
}) {
  return (
    <span className="countdown-column">
      <RollingUnit value={value} />
      <span className="countdown-label">{label}</span>
    </span>
  );
}

function RollingUnit({ value }: { value: string }) {
  const displayedRef = useRef(value);
  const [top, setTop] = useState(value);
  const [bottom, setBottom] = useState<string | null>(null);
  const [rolling, setRolling] = useState(false);

  useEffect(() => {
    if (value === displayedRef.current) return;

    const previous = displayedRef.current;
    displayedRef.current = value;

    setTop(previous);
    setBottom(value);
    setRolling(false);

    let resetTimer: number | undefined;

    const raf = requestAnimationFrame(() => {
      requestAnimationFrame(() => setRolling(true));
    });

    resetTimer = window.setTimeout(() => {
      // Сначала фиксируем новое значение, потом снимаем roll — без обратной анимации.
      setRolling(false);
      setBottom(null);
      setTop(value);
    }, ROLL_MS);

    return () => {
      cancelAnimationFrame(raf);
      if (resetTimer) window.clearTimeout(resetTimer);
    };
  }, [value]);

  return (
    <span className="countdown-unit" aria-hidden="true">
      <span
        className={cn(
          "countdown-unit-track",
          rolling && bottom && "countdown-unit-track-rolling",
        )}
      >
        <span className="countdown-unit-value">{top}</span>
        {bottom ? <span className="countdown-unit-value">{bottom}</span> : null}
      </span>
    </span>
  );
}

function CountdownSeparator() {
  return (
    <span aria-hidden="true" className="countdown-separator">
      :
    </span>
  );
}

export function MatchStartCountdown({
  startsAt,
  className,
}: {
  startsAt: Date | string;
  className?: string;
}) {
  const targetMs = new Date(startsAt).getTime();
  const [parts, setParts] = useState<CountdownParts | null>(() => {
    const diffMs = targetMs - Date.now();
    return diffMs > 0 ? parseCountdown(diffMs) : null;
  });

  useEffect(() => {
    const tick = () => {
      const diffMs = targetMs - Date.now();
      if (diffMs <= 0) {
        setParts(null);
        return;
      }
      setParts(parseCountdown(diffMs));
    };

    tick();
    const timerId = window.setInterval(tick, 1000);
    return () => window.clearInterval(timerId);
  }, [targetMs]);

  if (!parts) return null;

  const readable = `${parts.days}:${parts.hours}:${parts.minutes}:${parts.seconds}`;
  const days = Number.parseInt(parts.days, 10);

  return (
    <div className={cn("mt-3 flex w-full flex-col items-center gap-3", className)}>
      <p className="text-sm text-brand-muted">До начала матча</p>
      <div
        className="countdown-display"
        aria-live="polite"
        aria-atomic="true"
        aria-label={`До начала матча ${readable}`}
      >
        <CountdownColumn
          value={parts.days}
          label={pluralRu(days, ["день", "дня", "дней"])}
        />
        <CountdownSeparator />
        <CountdownColumn value={parts.hours} label="час." />
        <CountdownSeparator />
        <CountdownColumn value={parts.minutes} label="мин." />
        <CountdownSeparator />
        <CountdownColumn value={parts.seconds} label="сек." />
      </div>
      <div className="countdown-hint mt-1 w-full max-w-md rounded-2xl border border-brand-neutral/70 bg-brand-bg/80 px-4 py-3 text-center text-sm leading-relaxed text-brand-muted">
        Когда матч начнётся, вы сможете посмотреть прогнозы друзей и
        отслеживать статистику матча
      </div>
    </div>
  );
}
