import { TeamLabel } from "@/components/team/team-label";
import { cn } from "@/lib/utils";

export type MatchTeamRef = {
  name: string;
  countryCode?: string | null;
};

type MatchTeamsRowProps = {
  homeTeam: MatchTeamRef;
  awayTeam: MatchTeamRef;
  className?: string;
  flagClassName?: string;
  separator?: string;
};

/** Всегда: Название/Флаг — Флаг/Название */
export function MatchTeamsRow({
  homeTeam,
  awayTeam,
  className,
  flagClassName,
  separator = "—",
}: MatchTeamsRowProps) {
  return (
    <span
      className={cn(
        "inline-flex min-w-0 max-w-full flex-wrap items-center gap-x-2 gap-y-1",
        className,
      )}
    >
      <TeamLabel
        name={homeTeam.name}
        countryCode={homeTeam.countryCode}
        matchSide="home"
        flagClassName={flagClassName}
      />
      <span className="shrink-0 text-brand-muted" aria-hidden>
        {separator}
      </span>
      <TeamLabel
        name={awayTeam.name}
        countryCode={awayTeam.countryCode}
        matchSide="away"
        flagClassName={flagClassName}
      />
    </span>
  );
}
