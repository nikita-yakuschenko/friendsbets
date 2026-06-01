import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export function NoGamesPrompt() {
  return (
    <Card>
      <CardContent className="space-y-5 py-8 text-center">
        <p className="text-brand-muted">
          Вы пока не в турнире. Создайте турнир прогнозов или подключитесь по
          invite-коду от друга — после этого откроются разделы игры и админка.
        </p>
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Link href="/create">
            <Button className="w-full sm:w-auto">Создать турнир</Button>
          </Link>
          <Link href="/join">
            <Button variant="secondary" className="w-full sm:w-auto">
              Подключиться по invite
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
