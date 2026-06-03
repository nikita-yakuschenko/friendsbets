import { cn } from "@/lib/utils";

export const RECORD_CARD_EMPTY_CLASS =
  "rounded-xl border border-brand-neutral px-4 py-8 text-center text-sm text-brand-muted";

const detailRowClass =
  "grid grid-cols-[minmax(6.5rem,max-content)_1fr] items-center gap-x-4";

export function RecordCard({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <article
      className={cn(
        "rounded-xl border border-brand-neutral bg-brand-bg p-4",
        className,
      )}
    >
      {children}
    </article>
  );
}

export function RecordCardDetails({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "mt-4 space-y-3 border-t border-brand-neutral/60 pt-4 text-left text-xs",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function RecordCardFooter({
  children,
  className,
  stack,
}: {
  children: React.ReactNode;
  className?: string;
  /** Вертикальный футер (формы, несколько действий). */
  stack?: boolean;
}) {
  return (
    <footer
      className={cn(
        "mt-4 border-t border-brand-neutral/60 pt-3",
        stack
          ? "flex flex-col gap-3"
          : "flex flex-wrap items-center justify-between gap-x-4 gap-y-2",
        className,
      )}
    >
      {children}
    </footer>
  );
}

export function RecordDetailRow({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn(detailRowClass, className)}>
      <span className="text-brand-muted leading-normal">{label}</span>
      <div className="min-w-0 leading-normal text-white/90">{children}</div>
    </div>
  );
}

export function RecordCardTitle({
  children,
  className,
  as: Tag = "p",
}: {
  children: React.ReactNode;
  className?: string;
  as?: "p" | "h3";
}) {
  return (
    <Tag
      className={cn(
        "text-base font-medium leading-snug text-white",
        className,
      )}
    >
      {children}
    </Tag>
  );
}

export function RecordCardEmpty({ children }: { children: React.ReactNode }) {
  return <p className={RECORD_CARD_EMPTY_CLASS}>{children}</p>;
}
