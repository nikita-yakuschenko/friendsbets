import { parseChampionatTournamentUrl } from "@/lib/championat-url";
import type { ParsedChampionatTournamentUrl } from "@/lib/championat-url";
import { prisma } from "@/lib/db";

/** Источник Championat для турнира в БД (по externalId или шаблону). */
export async function resolveChampionatSourceForTournament(
  tournamentId: string,
): Promise<ParsedChampionatTournamentUrl | null> {
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    select: { externalId: true, description: true },
  });

  const externalId = tournament?.externalId;
  if (!externalId?.startsWith("championat:tournament:")) {
    return null;
  }

  const championatTournamentId = externalId.slice("championat:tournament:".length);
  if (!/^\d+$/.test(championatTournamentId)) return null;

  const template = await prisma.tournamentTemplate.findFirst({
    where: {
      championatUrl: { contains: `/tournament/${championatTournamentId}/` },
    },
    select: { championatUrl: true },
  });

  if (template) {
    return parseChampionatTournamentUrl(template.championatUrl);
  }

  if (tournament?.description) {
    const fromDescription = parseChampionatTournamentUrl(tournament.description);
    if (
      fromDescription &&
      fromDescription.tournamentExternalId === externalId
    ) {
      return fromDescription;
    }
  }

  return null;
}
