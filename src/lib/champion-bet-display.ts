import { prisma } from "@/lib/db";

/** countryCode команды из прогноза «кто станет чемпионом» по userId. */
export async function getChampionBetCountryByUserId(
  gameId: string,
): Promise<Map<string, string | null>> {
  const rows = await prisma.bonusPrediction.findMany({
    where: { gameId },
    select: {
      userId: true,
      team: { select: { countryCode: true } },
    },
  });

  return new Map(
    rows.map((row) => [row.userId, row.team.countryCode]),
  );
}
