import type { PrismaClient } from "@/generated/prisma/client";
import { parseChampionatTournamentUrl, type ParsedChampionatTournamentUrl } from "@/lib/championat-url";
import { prisma } from "@/lib/db";
import { ensureSystemTournamentTemplate } from "@/lib/platform-essentials";

export type TournamentTemplateUi = {
  id: string;
  title: string;
  description: string;
  isSystem: boolean;
  matchCount: number | null;
};

export async function ensureSystemTournamentTemplates(
  db: PrismaClient = prisma,
): Promise<void> {
  await ensureSystemTournamentTemplate(db);
}

export async function listTournamentTemplatesForUi(): Promise<TournamentTemplateUi[]> {
  await ensureSystemTournamentTemplates();

  const templates = await prisma.tournamentTemplate.findMany({
    orderBy: [{ isSystem: "desc" }, { title: "asc" }],
  });

  const items: TournamentTemplateUi[] = [];

  for (const template of templates) {
    const parsed = parseChampionatTournamentUrl(template.championatUrl);
    let matchCount: number | null = null;

    if (parsed) {
      const tournament = await prisma.tournament.findUnique({
        where: { externalId: parsed.tournamentExternalId },
        include: { _count: { select: { matches: true } } },
      });
      matchCount = tournament?._count.matches ?? 0;
    }

    items.push({
      id: template.id,
      title: template.title,
      description: template.description ?? "",
      isSystem: template.isSystem,
      matchCount,
    });
  }

  return items;
}

export async function getTournamentTemplateRecord(id: string) {
  return prisma.tournamentTemplate.findUnique({ where: { id } });
}

export async function saveTournamentTemplateFromProfessional(params: {
  title: string;
  description: string | null;
  championatUrl: string;
  createdById: string;
}): Promise<void> {
  const parsed = parseChampionatTournamentUrl(params.championatUrl);
  if (!parsed) {
    throw new Error("INVALID_CHAMPIONAT_URL");
  }

  await prisma.tournamentTemplate.upsert({
    where: { championatUrl: params.championatUrl },
    update: {
      title: params.title,
      description: params.description,
    },
    create: {
      title: params.title,
      description: params.description,
      championatUrl: params.championatUrl,
      isSystem: false,
      createdById: params.createdById,
    },
  });
}

export type CreateGameMode = "template" | "professional";

export async function resolveTournamentFromCreateForm(
  formData: FormData,
): Promise<
  | { ok: true; parsed: ParsedChampionatTournamentUrl; championatUrl: string }
  | { ok: false; error: string }
> {
  const mode = String(formData.get("createMode") ?? "template") as CreateGameMode;

  if (mode === "template") {
    const templateId = String(formData.get("tournamentTemplateId") ?? "").trim();
    const template = await getTournamentTemplateRecord(templateId);
    if (!template) {
      return { ok: false, error: "Выберите шаблон турнира." };
    }

    const parsed = parseChampionatTournamentUrl(template.championatUrl);
    if (!parsed) {
      return { ok: false, error: "Шаблон турнира настроен неверно. Сообщите администратору." };
    }

    return { ok: true, parsed, championatUrl: template.championatUrl };
  }

  const championatUrl = String(formData.get("championatUrl") ?? "").trim();
  if (!championatUrl) {
    return { ok: false, error: "Вставьте ссылку на турнир на championat.com." };
  }

  const parsed = parseChampionatTournamentUrl(championatUrl);
  if (!parsed) {
    return {
      ok: false,
      error:
        "Не удалось разобрать ссылку. Пример: https://www.championat.com/football/_worldcup/tournament/6858/calendar/",
    };
  }

  return { ok: true, parsed, championatUrl };
}

export function shouldSaveAsTemplate(formData: FormData): boolean {
  return String(formData.get("saveAsTemplate") ?? "") === "on";
}

/** Шаблон = данные уже в БД; только привязка Game → Tournament. */
export async function linkTournamentFromTemplate(templateId: string): Promise<
  | { ok: true; tournamentId: string; matchCount: number; templateTitle: string }
  | { ok: false; error: string }
> {
  const template = await getTournamentTemplateRecord(templateId);
  if (!template) {
    return { ok: false, error: "Выберите шаблон турнира." };
  }

  const parsed = parseChampionatTournamentUrl(template.championatUrl);
  if (!parsed) {
    return { ok: false, error: "Шаблон турнира настроен неверно. Сообщите администратору." };
  }

  const tournament = await prisma.tournament.findUnique({
    where: { externalId: parsed.tournamentExternalId },
    include: { _count: { select: { matches: true } } },
  });

  if (!tournament || tournament._count.matches === 0) {
    return {
      ok: false,
      error: `Шаблон «${template.title}» ещё не загружен в базу. Выполните npm run sync:championat или создайте турнир в профессиональном режиме с сохранением шаблона после первой загрузки данных.`,
    };
  }

  console.info(
    `[template-link] template=${template.id} tournament=${tournament.id} matches=${tournament._count.matches}`,
  );

  return {
    ok: true,
    tournamentId: tournament.id,
    matchCount: tournament._count.matches,
    templateTitle: template.title,
  };
}
