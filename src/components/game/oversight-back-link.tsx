import Link from "next/link";
import { Button } from "@/components/ui/button";
import { gamePlatformViewPath } from "@/lib/game-platform-view";

export function OversightBackLink({
  inviteCode,
  label = "← Турнир",
}: {
  inviteCode: string;
  label?: string;
}) {
  return (
    <Link href={gamePlatformViewPath(inviteCode)}>
      <Button type="button" variant="secondary" size="sm">
        {label}
      </Button>
    </Link>
  );
}
