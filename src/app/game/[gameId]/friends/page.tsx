import { redirect } from "next/navigation";
import { gamePath } from "@/lib/game-path";

export default async function FriendsRedirectPage({
  params,
}: {
  params: Promise<{ gameId: string }>;
}) {
  const { gameId } = await params;
  redirect(gamePath(gameId, "live"));
}
