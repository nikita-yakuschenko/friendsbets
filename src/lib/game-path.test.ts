import { describe, expect, it } from "vitest";
import { gamePath, gameRouteSegmentFromPathname } from "@/lib/game-path";

describe("gamePath", () => {
  it("строит путь турнира", () => {
    expect(gamePath("ABC123")).toBe("/game/ABC123");
    expect(gamePath("ABC123", "predictions")).toBe("/game/ABC123/predictions");
  });

  it("извлекает сегмент из pathname", () => {
    expect(gameRouteSegmentFromPathname("/game/X/predictions")).toBe("predictions");
    expect(gameRouteSegmentFromPathname("/game/X")).toBeUndefined();
  });
});
