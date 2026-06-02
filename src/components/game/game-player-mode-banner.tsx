import Link from "next/link";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { gamePlatformViewPath } from "@/lib/game-platform-view";

/** Суперадмин зашёл в турнир как участник — напоминание про режим просмотра. */
export function GamePlayerModeBanner({ inviteCode }: { inviteCode: string }) {
  return (
    <Alert className="mb-6 border-brand-neutral bg-brand-surface/80 text-brand-muted">
      <AlertDescription>
        <p className="text-sm">
          Вы в турнире как <span className="text-white">участник</span> (прогнозы
          и таблица для себя).{" "}
          <Link
            href={gamePlatformViewPath(inviteCode)}
            className="font-semibold text-brand-cyan hover:underline"
          >
            Открыть просмотр платформы
          </Link>
          {" — состав, контроль прогнозов без вступления заново."}
        </p>
      </AlertDescription>
    </Alert>
  );
}
