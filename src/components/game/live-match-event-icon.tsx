import {
  IconBallFootball,
  IconCircleLetterA,
  IconCircleLetterP,
  IconCropPortrait,
  IconHelp,
} from "@tabler/icons-react";
import type { ChampionatMatchEventType } from "@/lib/football-api/championat/match-protocol-types";
import { cn } from "@/lib/utils";

const ICON_SIZE = 24;
/** Буква P/A — почти как мяч, иначе на телефоне не читается */
const BADGE_SIZE = 18;

function GoalWithBadge({
  badge: BadgeIcon,
  badgeClassName,
}: {
  badge: typeof IconCircleLetterA;
  badgeClassName?: string;
}) {
  return (
    <span
      className="relative inline-flex h-8 w-9 shrink-0 items-end"
      aria-hidden
    >
      <IconBallFootball
        size={ICON_SIZE}
        stroke={1.75}
        className="text-white"
      />
      <BadgeIcon
        size={BADGE_SIZE}
        stroke={2}
        className={cn(
          "absolute -right-0.5 bottom-0 z-10 rounded-full bg-brand-bg p-px ring-1 ring-brand-neutral/70",
          badgeClassName,
        )}
      />
    </span>
  );
}

export function LiveMatchEventIcon({ type }: { type: ChampionatMatchEventType }) {
  switch (type) {
    case "GOAL":
      return (
        <span className="inline-flex h-8 w-9 shrink-0 items-center justify-center" aria-hidden>
          <IconBallFootball
            size={ICON_SIZE}
            stroke={1.75}
            className="text-white"
          />
        </span>
      );
    case "PENALTY_GOAL":
      return (
        <GoalWithBadge
          badge={IconCircleLetterP}
          badgeClassName="text-brand-lime"
        />
      );
    case "OWN_GOAL":
      return (
        <GoalWithBadge
          badge={IconCircleLetterA}
          badgeClassName="text-brand-muted"
        />
      );
    case "YELLOW_CARD":
      return (
        <span className="inline-flex h-8 w-9 shrink-0 items-center justify-center" aria-hidden>
          <IconCropPortrait
            size={ICON_SIZE}
            stroke={1.75}
            className="text-brand-lime"
          />
        </span>
      );
    case "RED_CARD":
      return (
        <span className="inline-flex h-8 w-9 shrink-0 items-center justify-center" aria-hidden>
          <IconCropPortrait
            size={ICON_SIZE}
            stroke={1.75}
            className="text-brand-red"
          />
        </span>
      );
    default:
      return (
        <span className="inline-flex h-8 w-9 shrink-0 items-center justify-center" aria-hidden>
          <IconHelp
            size={ICON_SIZE}
            stroke={1.75}
            className="text-brand-muted"
          />
        </span>
      );
  }
}
