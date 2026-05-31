import { Radio } from "lucide-react";
import { cn } from "@/lib/utils";

export function LiveNavLabel({
  showIcon = false,
  compact = false,
  className,
}: {
  showIcon?: boolean;
  compact?: boolean;
  className?: string;
}) {
  const dot = (
    <span
      className={cn(
        "inline-block shrink-0 rounded-full bg-brand-red live-pulse-dot",
        compact ? "h-1.5 w-1.5" : "h-2 w-2",
      )}
      aria-hidden="true"
    />
  );

  return (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      {showIcon ? (
        <Radio className="h-4 w-4 shrink-0" aria-hidden="true" />
      ) : null}
      <span className="inline-flex items-center gap-1">
        {dot}
        Лайв
      </span>
    </span>
  );
}
