import { parseChampionatTournamentUrl } from "@/lib/championat-url";
import { prisma } from "@/lib/db";

/** Подпись турнира Championat: сначала название шаблона, иначе title из БД. */
export async function buildTournamentSourceLabelMap(
  externalIds: Array<string | null | undefined>,
): Promise<Map<string, string>> {
  const unique = [...new Set(externalIds.filter((id): id is string => Boolean(id)))];
  if (unique.length === 0) return new Map();

  const result = new Map<string, string>();

  const templates = await prisma.tournamentTemplate.findMany({
    select: { title: true, championatUrl: true },
  });

  for (const template of templates) {
    const parsed = parseChampionatTournamentUrl(template.championatUrl);
    if (!parsed || !unique.includes(parsed.tournamentExternalId)) continue;
    result.set(parsed.tournamentExternalId, template.title);
  }

  const missing = unique.filter((id) => !result.has(id));
  if (missing.length > 0) {
    const tournaments = await prisma.tournament.findMany({
      where: { externalId: { in: missing } },
      select: { externalId: true, title: true },
    });
    for (const tournament of tournaments) {
      if (tournament.externalId) {
        result.set(tournament.externalId, tournament.title);
      }
    }
  }

  return result;
}

export function resolveSourceLabelForGame(
  gameTitle: string,
  tournamentExternalId: string | null | undefined,
  labelByExternalId: Map<string, string>,
): string | null {
  if (!tournamentExternalId) return null;
  const source = labelByExternalId.get(tournamentExternalId);
  if (!source) return null;
  if (source.trim().toLowerCase() === gameTitle.trim().toLowerCase()) {
    return null;
  }
  return source;
}
