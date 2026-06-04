import { Badge } from "@/components/ui/badge";
import type { AdminUserGameRef } from "@/components/admin/users/types";

export function GameMembershipList({
  games,
  variant,
}: {
  games: AdminUserGameRef[];
  variant: "organizer" | "participant";
}) {
  if (games.length === 0) {
    return <span className="text-sm text-brand-muted">—</span>;
  }

  return (
    <ul className="flex flex-wrap gap-1.5">
      {games.map((game) => (
        <li key={game.id} className="max-w-full">
          <Badge
            variant={variant === "organizer" ? "default" : "secondary"}
            className="max-w-32 truncate font-normal sm:max-w-36"
            title={game.title}
          >
            {game.title}
          </Badge>
        </li>
      ))}
    </ul>
  );
}
