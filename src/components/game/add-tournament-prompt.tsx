import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export function AddTournamentPrompt() {
  return (
    <Card>
      <CardContent className="space-y-5 py-8 text-center">
        <p className="text-brand-muted">
          Создайте новый турнир прогнозов или подключитесь к существующему по
          invite-коду — он появится в списке «Мои турниры».
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
