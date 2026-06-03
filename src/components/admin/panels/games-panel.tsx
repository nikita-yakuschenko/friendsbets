import Link from "next/link";
import { AdminGamesDataTable } from "@/components/admin/games/games-data-table";
import type { AdminGameRow } from "@/components/admin/games/types";
import { AdminPanelActions } from "@/components/admin/admin-panel-actions";
import { Button } from "@/components/ui/button";
import { gamePath } from "@/lib/game-path";
import { buildRegisterInviteUrl } from "@/lib/game-invite";
import { gamePlatformViewPath } from "@/lib/game-platform-view";
import { formatGameOrganizersLine } from "@/lib/game-organizer";

type AdminGame = {
  id: string;
  title: string;
  inviteCode: string;
  createdAt: Date;
  scoringRule: { title: string };
  createdBy: { name: string };
  participants: Array<{ displayName: string }>;
  _count: { participants: number };
};

function toRows(games: AdminGame[], platformOversightOpen: boolean): AdminGameRow[] {
  return games.map((game) => {
    const organizerNames = game.participants
      .map((p) => p.displayName.trim())
      .filter(Boolean);
    const organizers = formatGameOrganizersLine(
      [...new Set(organizerNames)],
    );

    return {
      id: game.id,
      title: game.title,
      inviteCode: game.inviteCode,
      inviteLinkUrl: buildRegisterInviteUrl(game.inviteCode),
      createdByName: game.createdBy.name,
      organizerLabel: organizers.label,
      organizerNames: organizers.text,
      createdAt: game.createdAt.toISOString(),
      scoringRuleTitle: game.scoringRule.title,
      participantsCount: game._count.participants,
      openHref: platformOversightOpen
        ? gamePlatformViewPath(game.inviteCode)
        : gamePath(game.inviteCode),
    };
  });
}

export function AdminGamesPanel({
  games,
  platformOversightOpen = false,
}: {
  games: AdminGame[];
  platformOversightOpen?: boolean;
}) {
  const defaultGame = games[0];
  const rows = toRows(games, platformOversightOpen);

  return (
    <div className="space-y-4">
      <AdminPanelActions>
        <Link href="/create">
          <Button size="sm">Создать турнир</Button>
        </Link>
        {defaultGame ? (
          <Link
            href={`/admin/missing?game=${encodeURIComponent(defaultGame.inviteCode)}`}
          >
            <Button size="sm" variant="secondary">
              Кто не поставил
            </Button>
          </Link>
        ) : null}
      </AdminPanelActions>

      <AdminGamesDataTable data={rows} />
    </div>
  );
}
