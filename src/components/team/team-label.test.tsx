import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { MatchTeamsRow } from "@/components/team/match-teams-row";
import { TeamLabel } from "@/components/team/team-label";

describe("team label layout", () => {
  it("home: название перед флагом в DOM", () => {
    const { container } = render(
      <TeamLabel name="Мексика" countryCode="MX" matchSide="home" />,
    );
    const root = container.firstElementChild!;
    const children = [...root.childNodes].map((n) => n.textContent?.trim() ?? "");
    expect(children[0]).toBe("Мексика");
    expect(children[1]).toBe("");
  });

  it("away: флаг перед названием в DOM", () => {
    const { container } = render(
      <TeamLabel name="ЮАР" countryCode="ZA" matchSide="away" />,
    );
    const root = container.firstElementChild!;
    expect(root.querySelector("img")).toBeTruthy();
    expect(root.textContent).toContain("ЮАР");
    const imgIndex = [...root.childNodes].findIndex((n) => n.nodeName === "IMG");
    const textIndex = [...root.childNodes].findIndex(
      (n) => n.textContent?.includes("ЮАР"),
    );
    expect(imgIndex).toBeLessThan(textIndex);
  });

  it("MatchTeamsRow — Мексика/флаг — флаг/ЮАР", () => {
    const { container } = render(
      <MatchTeamsRow
        homeTeam={{ name: "Мексика", countryCode: "MX" }}
        awayTeam={{ name: "ЮАР", countryCode: "ZA" }}
      />,
    );
    const row = container.firstElementChild!;
    const teamSpans = row.querySelectorAll(":scope > span.inline-flex");
    expect(teamSpans.length).toBe(2);
    const homeNodes = [...teamSpans[0]!.childNodes];
    expect(homeNodes[0]?.textContent).toBe("Мексика");
    expect(homeNodes[1]?.nodeName).toBe("IMG");
    const awayNodes = [...teamSpans[1]!.childNodes];
    expect(awayNodes[0]?.nodeName).toBe("IMG");
    expect(awayNodes[1]?.textContent).toBe("ЮАР");
  });
});
