import Link from "next/link";
import { MatchStartCountdown } from "@/components/game/match-start-countdown";
import { TeamLabel } from "@/components/team/team-label";
import { Card, CardContent } from "@/components/ui/card";
import { getFlagImageSrcSet, getFlagImageUrl } from "@/lib/teams";
import { formatMatchVenue } from "@/lib/venue";
import { cn, formatDateTimeMoscow } from "@/lib/utils";

type NextMatchPreviewProps = {
  match: {
    startsAt: Date;
    venueName: string | null;
    venueCity: string | null;
    homeTeam: { name: string; countryCode: string | null };
    awayTeam: { name: string; countryCode: string | null };
  };
  hasPrediction: boolean;
  prediction?: { homeScore: number; awayScore: number } | null;
  predictionsHref?: string;
  showCountdown?: boolean;
};

function TeamFlag({
  countryCode,
  className,
}: {
  countryCode: string | null;
  className?: string;
}) {
  const flagUrl = getFlagImageUrl(countryCode);
  if (!flagUrl) return null;

  return (
    <img
      src={flagUrl}
      srcSet={getFlagImageSrcSet(countryCode) ?? undefined}
      width={16}
      height={12}
      alt=""
      aria-hidden="true"
      className={cn("h-3 w-4 shrink-0 rounded-sm object-cover", className)}
      loading="lazy"
      decoding="async"
    />
  );
}

export function FloatingPredictionNotice({
  hasPrediction,
  prediction,
  match,
  predictionsHref,
}: {
  hasPrediction: boolean;
  prediction?: { homeScore: number; awayScore: number } | null;
  match: NextMatchPreviewProps["match"];
  predictionsHref?: string;
}) {
  const pillClass = cn(
    "inline-flex w-full max-w-sm flex-col items-center gap-0.5 rounded-2xl border-[0.5px] bg-brand-bg px-5 py-1.5 text-[11px] leading-tight font-normal shadow-[0_4px_16px_rgba(0,0,0,0.3)] transition-colors sm:max-w-md",
    hasPrediction
      ? "border-brand-lime/80 text-brand-muted"
      : "border-brand-red/80 text-brand-muted hover:bg-brand-red/5",
  );

  const content =
    hasPrediction && prediction ? (
      <>
        <span>Ваш прогноз</span>
        <span className="grid w-full grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-x-1 tabular-nums text-white">
          <span className="inline-flex items-center justify-end gap-0.5 text-right">
            <span className="truncate">{match.homeTeam.name}</span>
            <TeamFlag countryCode={match.homeTeam.countryCode} />
          </span>
          <span className="shrink-0 px-0.5">
            {prediction.homeScore}:{prediction.awayScore}
          </span>
          <span className="inline-flex items-center justify-start gap-0.5 text-left">
            <TeamFlag countryCode={match.awayTeam.countryCode} />
            <span className="truncate">{match.awayTeam.name}</span>
          </span>
        </span>
      </>
    ) : (
      <>
        <span>Ваш прогноз</span>
        <span>не сделан</span>
      </>
    );

  if (!hasPrediction && predictionsHref) {
    return (
      <Link href={predictionsHref} className={pillClass}>
        {content}
      </Link>
    );
  }

  return <div className={pillClass}>{content}</div>;
}

export function NextMatchPreview({
  match,
  hasPrediction,
  prediction,
  predictionsHref,
  showCountdown = false,
}: NextMatchPreviewProps) {
  const venue = formatMatchVenue(match.venueName, match.venueCity);

  return (
    <section>
      <h2 className="mb-3 text-sm font-normal tracking-wide text-brand-muted">
        Ближайший матч
      </h2>

      <Card className="relative overflow-hidden p-0">
        <CardContent className="relative px-4 py-3">
          <div className="relative z-10 mx-auto mb-3 flex w-full max-w-md justify-center">
            <FloatingPredictionNotice
              hasPrediction={hasPrediction}
              prediction={prediction}
              match={match}
              predictionsHref={predictionsHref}
            />
          </div>

          <div className="relative z-0 mx-auto flex w-full max-w-md flex-col items-center gap-1.5 text-center">
            <div className="grid w-full grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-x-2 text-lg font-semibold leading-snug sm:gap-x-3">
              <div className="flex justify-end">
                <TeamLabel
                  name={match.homeTeam.name}
                  countryCode={match.homeTeam.countryCode}
                  flagPosition="after"
                />
              </div>
              <span className="shrink-0 px-0.5 text-brand-muted">—</span>
              <div className="flex justify-start">
                <TeamLabel
                  name={match.awayTeam.name}
                  countryCode={match.awayTeam.countryCode}
                  flagPosition="before"
                />
              </div>
            </div>

            <p className="max-w-full text-sm text-brand-muted">
              {formatDateTimeMoscow(match.startsAt)}
            </p>
            {venue ? (
              <p className="max-w-full text-sm text-brand-muted">{venue}</p>
            ) : null}
            {showCountdown ? <MatchStartCountdown startsAt={match.startsAt} /> : null}
          </div>
        </CardContent>
      </Card>
    </section>
  );
}

export function NextMatchEmpty() {
  return (
    <section>
      <h2 className="mb-3 text-sm font-normal tracking-wide text-brand-muted">
        Ближайший матч
      </h2>
      <Card>
        <CardContent className="py-8 text-center text-brand-muted">
          Нет предстоящих матчей.
        </CardContent>
      </Card>
    </section>
  );
}
