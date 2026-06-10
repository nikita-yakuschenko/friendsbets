import Link from "next/link";
import { LiveMatchHomePreview } from "@/components/game/live-match-home-preview";
import { gamePath } from "@/lib/game-path";
import type { LiveMatchItem } from "@/server/actions/games";

type LiveMatchPickerListProps = {
  inviteCode: string;
  items: LiveMatchItem[];
};

export function LiveMatchPickerList({
  inviteCode,
  items,
}: LiveMatchPickerListProps) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-brand-muted">
        Сейчас идёт {items.length}{" "}
        {items.length === 1
          ? "матч"
          : items.length < 5
            ? "матча"
            : "матчей"}
        . Выберите, чтобы открыть лайв-трансляцию и прогнозы друзей.
      </p>
      {items.map(({ match, myPrediction }) => (
        <Link
          key={match.id}
          href={gamePath(inviteCode, `live/${match.id}`)}
          className="block rounded-2xl transition-opacity hover:opacity-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-lime"
        >
          <LiveMatchHomePreview
            matchId={match.id}
            match={match}
            hasPrediction={Boolean(myPrediction)}
            prediction={
              myPrediction
                ? {
                    homeScore: myPrediction.homeScore,
                    awayScore: myPrediction.awayScore,
                  }
                : null
            }
          />
        </Link>
      ))}
    </div>
  );
}
