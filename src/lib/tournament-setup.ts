import { TournamentStatus } from "@/generated/prisma/client";
import type { ParsedChampionatTournamentUrl } from "@/lib/championat-url";
import { fetchChampionatCalendar } from "@/lib/football-api/championat/parser";
import {
  enrichChampionatVenuesOnly,
  syncChampionatTournament,
} from "@/lib/football-api/sync";
import { prisma } from "@/lib/db";

import { fetchChampionatHtml } from "@/lib/football-api/championat/fetch-html";

async function fetchChampionatTournamentTitle(
  calendarUrl: string,
): Promise<string | null> {
  try {
    const html = await fetchChampionatHtml(calendarUrl, { timeoutMs: 8_000 });
    const h1 = html.match(/<h1[^>]*>([^<]+)</i)?.[1];
    if (!h1) return null;

    return h1.replace(/\s+/g, " ").trim() || null;
  } catch {
    return null;
  }
}

export async function ensureChampionatTournament(
  parsed: ParsedChampionatTournamentUrl,
): Promise<{ id: string; title: string; matchCount: number }> {
  console.info(
    `[tournament-setup] start championat=${parsed.championatTournamentId}`,
  );

  const existing = await prisma.tournament.findUnique({
    where: { externalId: parsed.tournamentExternalId },
    include: { _count: { select: { matches: true } } },
  });

  if (existing && existing._count.matches > 0) {
    console.info(
      `[tournament-setup] reuse existing id=${existing.id} matches=${existing._count.matches}`,
    );
    return {
      id: existing.id,
      title: existing.title,
      matchCount: existing._count.matches,
    };
  }

  const scrapedTitle = await fetchChampionatTournamentTitle(parsed.calendarUrl);
  const fallbackTitle = `Турнир Championat #${parsed.championatTournamentId}`;
  const title = scrapedTitle ?? fallbackTitle;

  const tournament =
    existing ??
    (await prisma.tournament.create({
      data: {
        externalId: parsed.tournamentExternalId,
        title,
        description: parsed.calendarUrl,
        status: TournamentStatus.ACTIVE,
      },
    }));

  if (existing && scrapedTitle && existing.title !== scrapedTitle) {
    await prisma.tournament.update({
      where: { id: existing.id },
      data: { title: scrapedTitle, description: parsed.calendarUrl },
    });
  }

  console.info("[tournament-setup] syncing calendar (without venues)…");
  const syncResult = await syncChampionatTournament(tournament.id, parsed, {
    enrichVenues: false,
  });
  console.info("[tournament-setup] sync done", syncResult);

  const matchCount = await prisma.match.count({
    where: { tournamentId: tournament.id },
  });

  if (matchCount === 0) {
    const preview = await fetchChampionatCalendar(parsed.calendarUrl);
    if (preview.length === 0) {
      throw new Error(
        "Не удалось загрузить матчи с Championat. Проверьте ссылку и что календарь турнира доступен.",
      );
    }
    throw new Error(
      "Календарь найден, но матчи не сохранились. Попробуйте ещё раз через минуту.",
    );
  }

  return {
    id: tournament.id,
    title: scrapedTitle ?? tournament.title,
    matchCount,
  };
}

/** Стадионы — отдельно, в фоне (долго, много запросов к Championat). */
export async function enrichChampionatTournamentVenues(
  tournamentId: string,
  parsed: ParsedChampionatTournamentUrl,
): Promise<void> {
  console.info(`[tournament-setup] background venues tournament=${tournamentId}`);
  try {
    const venuesUpdated = await enrichChampionatVenuesOnly(tournamentId, parsed);
    console.info(
      `[tournament-setup] background venues done updated=${venuesUpdated}`,
    );
  } catch (error) {
    console.error("[tournament-setup] background venues failed", error);
  }
}
