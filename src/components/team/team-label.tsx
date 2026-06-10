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
  /**
   * В паре матча: home = «Название/Флаг», away = «Флаг/Название».
   * Имеет приоритет над flagPosition.
   */
  matchSide?: "home" | "away";
  /** Флаг до или после названия (для одиночной команды вне пары). */
  flagPosition?: "before" | "after";
  /** Однострочное обрезание — только там, где места мало намеренно. */
  truncate?: boolean;
};

export function TeamLabel({
  name,
  countryCode,
  className,
  flagClassName,
  matchSide,
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

  const flagFirst =
    matchSide === "away" ||
    (matchSide === undefined && flagPosition === "before");

  const nameClassName = cn(
    "min-w-0",
    truncate
      ? "truncate"
      : "break-words leading-tight [overflow-wrap:anywhere]",
  );

  return (
    <span
      className={cn(
        "inline-flex min-w-0 max-w-full items-center gap-1 sm:gap-2",
        className,
      )}
      title={truncate ? name : undefined}
    >
      {flagFirst ? (
        <>
          {flag}
          <span className={nameClassName}>{name}</span>
        </>
      ) : (
        <>
          <span className={nameClassName}>{name}</span>
          {flag}
        </>
      )}
    </span>
  );
}
