import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

/** Суперадмин без участия в турнирах — доступ к платформе не через invite. */
export function PlatformAdminHomePrompt() {
  return (
    <Card>
      <CardContent className="space-y-5 py-8 text-center">
        <p className="text-brand-muted">
          Вы суперадмин платформы. Управление турнирами, матчами, шаблонами и
          пользователями — в разделе «Платформа». Участие в турнире не
          обязательно.
        </p>
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Link href="/admin">
            <Button className="w-full sm:w-auto">Платформа</Button>
          </Link>
          <Link href="/create">
            <Button variant="secondary" className="w-full sm:w-auto">
              Создать турнир
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
