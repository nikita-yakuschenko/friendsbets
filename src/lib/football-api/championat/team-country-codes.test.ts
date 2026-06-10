import { describe, expect, it } from "vitest";
import {
  resolveTeamCountryCode,
  resolveTeamFlagCode,
} from "@/lib/football-api/championat/team-country-codes";

describe("team country codes", () => {
  it("резолвит сборные товарищеских матчей", () => {
    expect(resolveTeamCountryCode("Коста-Рика")).toBe("CR");
    expect(resolveTeamCountryCode("Боливия")).toBe("BO");
    expect(resolveTeamCountryCode("Нигерия")).toBe("NG");
  });

  it("fallback по названию, если countryCode в БД пустой", () => {
    expect(resolveTeamFlagCode("Боливия", null)).toBe("BO");
    expect(resolveTeamFlagCode("Боливия", "")).toBe("BO");
  });

  it("предпочитает countryCode из БД", () => {
    expect(resolveTeamFlagCode("Боливия", "XX")).toBe("XX");
  });
});
