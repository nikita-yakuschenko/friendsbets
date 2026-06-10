import {
  getFlagImageSrcSet,
  getFlagImageUrl,
  resolveTeamFlagCode,
} from "@/lib/teams";
import { cn } from "@/lib/utils";

type TeamLabelProps = {
  name: string;
  countryCode?: string | null;
  className?: string;
  flagClassName?: string;
  /** Флаг до или после названия команды. */
  flagPosition?: "before" | "after";
  /** Однострочное обрезание — только там, где места мало намеренно. */
  truncate?: boolean;
};

export function TeamLabel({
  name,
  countryCode,
  className,
  flagClassName,
  flagPosition = "before",
  truncate = false,
}: TeamLabelProps) {
  const flagCode = resolveTeamFlagCode(name, countryCode);
  const flagUrl = getFlagImageUrl(flagCode);

  const flag = flagUrl ? (
    <img
      src={flagUrl}
      srcSet={getFlagImageSrcSet(flagCode) ?? undefined}
      width={24}
      height={18}
      alt=""
      aria-hidden="true"
      className={cn("h-[18px] w-6 shrink-0 rounded-sm object-cover", flagClassName)}
      loading="lazy"
      decoding="async"
    />
  ) : null;

  const nameClassName = cn(
    "min-w-0",
    truncate
      ? "truncate"
      : cn(
          "break-words leading-tight [overflow-wrap:anywhere]",
          flagPosition === "after" ? "text-right" : "text-left",
        ),
  );

  return (
    <span
      className={cn(
        "inline-flex min-w-0 max-w-full items-center gap-1 sm:gap-2",
        flagPosition === "after" && "flex-row-reverse",
        className,
      )}
      title={truncate ? name : undefined}
    >
      {flag}
      <span className={nameClassName}>{name}</span>
    </span>
  );
}
