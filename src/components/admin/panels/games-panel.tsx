import Link from "next/link";
import { AdminGamesDataTable } from "@/components/admin/games/games-data-table";
import type { AdminGameRow } from "@/components/admin/games/types";
import { AdminPanelActions } from "@/components/admin/admin-panel-actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buildRegisterInviteUrl } from "@/lib/game-invite";

type AdminGame = {
  id: string;
  title: string;
  inviteCode: string;
  createdAt: Date;
  scoringRule: { title: string };
  _count: { participants: number };
};

function toRows(games: AdminGame[]): AdminGameRow[] {
  return games.map((game) => ({
    id: game.id,
    title: game.title,
    inviteCode: game.inviteCode,
    inviteLinkUrl: buildRegisterInviteUrl(game.inviteCode),
    createdAt: game.createdAt.toISOString(),
    scoringRuleTitle: game.scoringRule.title,
    participantsCount: game._count.participants,
  }));
}

export function AdminGamesPanel({ games }: { games: AdminGame[] }) {
  const defaultGame = games[0];
  const rows = toRows(games);

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

      <Card>
        <CardHeader>
          <CardTitle>Игры</CardTitle>
        </CardHeader>
        <CardContent>
          <AdminGamesDataTable data={rows} />
        </CardContent>
      </Card>
    </div>
  );
}
