import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  }),
}));

vi.mock("next/headers", () => ({
  headers: vi.fn(async () => new Headers()),
}));

vi.mock("next/server", () => ({
  after: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  requireAuth: vi.fn(async () => ({
    id: "user-1",
    email: "u@test.com",
    name: "User",
    role: "PARTICIPANT",
  })),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    scoringRule: { findFirst: vi.fn(), findMany: vi.fn() },
    game: { findUnique: vi.fn(), create: vi.fn() },
  },
}));

vi.mock("@/lib/tournament-templates", () => ({
  listTournamentTemplatesForUi: vi.fn(async () => [
    { id: "tpl-1", title: "Шаблон", isSystem: true },
  ]),
  resolveTournamentFromCreateForm: vi.fn(),
  linkTournamentFromTemplate: vi.fn(),
  saveTournamentTemplateFromProfessional: vi.fn(),
  shouldSaveAsTemplate: vi.fn(() => false),
  getTournamentTemplateRecord: vi.fn(),
}));

vi.mock("@/lib/game-invite", () => ({
  createUniqueInviteCode: vi.fn(async () => "NEWCODE1"),
  createUniqueGameSlug: vi.fn(async () => "new-game"),
  buildGameUrl: vi.fn(),
  buildRegisterInviteUrl: vi.fn(),
}));

vi.mock("@/lib/tournament-setup", () => ({
  ensureChampionatTournament: vi.fn(),
  enrichChampionatTournamentVenues: vi.fn(),
}));

vi.mock("@/lib/game-access", () => ({
  revalidateGamePaths: vi.fn(),
  normalizeGameRouteParam: vi.fn((s: string) => s),
}));

import { prisma } from "@/lib/db";
import { resolveTournamentFromCreateForm } from "@/lib/tournament-templates";
import { createGameAction } from "@/server/actions/create-game";

function form(entries: Record<string, string>) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(entries)) fd.set(k, v);
  return fd;
}

describe("createGameAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.scoringRule.findFirst).mockResolvedValue({
      id: "rule-1",
    } as never);
    vi.mocked(resolveTournamentFromCreateForm).mockResolvedValue({
      tournamentId: "t-1",
    } as never);
    vi.mocked(prisma.game.create).mockResolvedValue({
      id: "g-new",
      inviteCode: "NEWCODE1",
    } as never);
  });

  it("требует название", async () => {
    const result = await createGameAction(
      undefined,
      form({ title: "", scoringRuleId: "rule-1", createMode: "template" }),
    );
    expect(result.error).toMatch(/название/i);
  });

  it("требует схему очков", async () => {
    const result = await createGameAction(
      undefined,
      form({ title: "Cup", scoringRuleId: "", createMode: "template" }),
    );
    expect(result.error).toMatch(/схему/i);
  });

  it("отклоняет неверный invite-код", async () => {
    const result = await createGameAction(
      undefined,
      form({
        title: "Cup",
        scoringRuleId: "rule-1",
        inviteCode: "!!!",
        createMode: "template",
        tournamentTemplateId: "tpl-1",
      }),
    );
    expect(result.error).toBeTruthy();
  });
});
