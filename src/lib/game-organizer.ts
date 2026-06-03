import { GameParticipantRole } from "@/generated/prisma/client";

/** Единственный организатор и единственный участник — вместо выхода показываем удаление турнира. */
export function canDeleteSoloOrganizerTournament(
  role: GameParticipantRole,
  organizerCount: number,
  participantsCount: number,
): boolean {
  return (
    role === GameParticipantRole.ORGANIZER &&
    organizerCount === 1 &&
    participantsCount === 1
  );
}

/** Можно ли покинуть турнир: участник всегда; организатор — если останется ещё ≥1 организатор. */
export function canLeaveGameMembership(
  role: GameParticipantRole,
  organizerCount: number,
  participantsCount: number,
): boolean {
  if (canDeleteSoloOrganizerTournament(role, organizerCount, participantsCount)) {
    return false;
  }
  if (role !== GameParticipantRole.ORGANIZER) return true;
  return organizerCount > 1;
}

/** Все организаторы турнира (displayName), иначе создатель. */
export function getGameOrganizerDisplayNames(game: {  createdBy: { name: string };
  participants: Array<{ displayName: string }>;
}): string[] {
  if (game.participants.length > 0) {
    return game.participants.map((p) => p.displayName);
  }
  return [game.createdBy.name];
}

export function formatGameOrganizersLine(names: string[]): {
  label: "Организатор" | "Организаторы";
  text: string;
} {
  const unique = [...new Set(names.map((n) => n.trim()).filter(Boolean))];
  return {
    label: unique.length === 1 ? "Организатор" : "Организаторы",
    text: unique.join(", "),
  };
}

/** @deprecated Используйте getGameOrganizerDisplayNames + formatGameOrganizersLine */
export function getGameOrganizerDisplayName(game: {
  createdBy: { name: string };
  participants: Array<{ displayName: string }>;
}): string {
  return formatGameOrganizersLine(getGameOrganizerDisplayNames(game)).text;
}
