import { describe, expect, it } from "vitest";
import {
  teamAccusative,
  teamBeliefPronoun,
  teamBelievedForm,
  teamGenitive,
} from "@/lib/team-name-declension";

describe("team name declension", () => {
  it("винительный после «за»", () => {
    expect(teamAccusative("Португалия")).toBe("Португалию");
    expect(teamAccusative("Нигерия")).toBe("Нигерию");
    expect(teamAccusative("Коста-Рика")).toBe("Коста-Рику");
    expect(teamAccusative("Алжир")).toBe("Алжир");
    expect(teamAccusative("Нидерланды")).toBe("Нидерланды");
  });

  it("родительный для «победа» и «у»", () => {
    expect(teamGenitive("Португалия")).toBe("Португалии");
    expect(teamGenitive("Боливия")).toBe("Боливии");
    expect(teamGenitive("Алжир")).toBe("Алжира");
  });

  it("согласование «верила/верил»", () => {
    expect(teamBelievedForm("Португалия")).toBe("верила");
    expect(teamBelievedForm("Алжир")).toBe("верил");
    expect(teamBelievedForm("Нидерланды")).toBe("верили");
    expect(teamBeliefPronoun("Португалия")).toBe("неё");
    expect(teamBeliefPronoun("Алжир")).toBe("него");
    expect(teamBeliefPronoun("Нидерланды")).toBe("них");
  });

  it("эвристика для неизвестной сборной на -ия", () => {
    expect(teamAccusative("Словения")).toBe("Словению");
  });
});
