import Link from "next/link";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { gamePath } from "@/lib/game-path";
import { gamePlatformViewPath } from "@/lib/game-platform-view";

export function GameOversightBanner({
  inviteCode,
  isAlsoParticipant = false,
}: {
  inviteCode: string;
  isAlsoParticipant?: boolean;
}) {
  return (
    <Alert className="mb-6 border-brand-cyan/30 bg-brand-cyan/5 text-brand-muted">
      <AlertDescription>
        <p className="font-medium text-white">Просмотр турнира (суперадмин)</p>
        <p className="mt-2">
          Вы уже внутри — вступать не нужно. Доступны состав, таблица, кто не
          поставил прогноз и лайв. Свои прогнозы здесь ставить нельзя.
        </p>
        {isAlsoParticipant ? (
          <p className="mt-3 text-sm">
            Вы также записаны участником этого турнира.{" "}
            <Link
              href={gamePath(inviteCode)}
              className="font-semibold text-brand-cyan hover:underline"
            >
              Перейти в режим игрока
            </Link>
            {" · "}
            <Link
              href={gamePlatformViewPath(inviteCode, "control")}
              className="font-semibold text-brand-cyan hover:underline"
            >
              Кто не поставил
            </Link>
          </p>
        ) : (
          <p className="mt-3 text-sm">
            Лично поиграть в этом турнире можно только через{" "}
            <Link
              href={`/join?invite=${encodeURIComponent(inviteCode)}`}
              className="font-semibold text-brand-cyan hover:underline"
            >
              вступление по invite
            </Link>
            — это отдельно от просмотра.
          </p>
        )}
      </AlertDescription>
    </Alert>
  );
}
