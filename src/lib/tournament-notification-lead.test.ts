import { describe, expect, it } from "vitest";
import {
  formatTournamentNotificationLead,
  joinTournamentNotificationBody,
} from "@/lib/tournament-notification-lead";

describe("tournament notification lead", () => {
  it("форматирует название турнира", () => {
    expect(formatTournamentNotificationLead("ЧМ 2026")).toBe(
      "В турнире «ЧМ 2026»",
    );
  });

  it("добавляет строку в начало тела", () => {
    expect(
      joinTournamentNotificationBody("Кубок", ["Первая строка", "Вторая"]),
    ).toBe("В турнире «Кубок»\n\nПервая строка\nВторая");
  });
});
