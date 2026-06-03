import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { signSession, verifySessionToken } from "@/lib/auth";

describe("session token", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-01T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("подписывает и проверяет валидный токен", () => {
    const token = signSession("user-1");
    expect(verifySessionToken(token)).toEqual({ userId: "user-1" });
  });

  it("отклоняет подделанную подпись", () => {
    const token = signSession("user-1");
    const decoded = Buffer.from(token, "base64url").toString("utf8");
    const lastDot = decoded.lastIndexOf(".");
    const payload = decoded.slice(0, lastDot);
    const sig = decoded.slice(lastDot + 1);
    const brokenSig = `${sig.slice(0, -1)}0`;
    const broken = Buffer.from(`${payload}.${brokenSig}`).toString("base64url");
    expect(verifySessionToken(broken)).toBeNull();
  });

  it("отклоняет истёкший токен", () => {
    const token = signSession("user-1");
    vi.setSystemTime(new Date("2026-08-01T12:00:00Z"));
    expect(verifySessionToken(token)).toBeNull();
  });

  it("отклоняет мусор", () => {
    expect(verifySessionToken("not-a-token")).toBeNull();
  });

  it("отклоняет подпись неправильной длины", () => {
    const token = signSession("user-1");
    const decoded = Buffer.from(token, "base64url").toString("utf8");
    const lastDot = decoded.lastIndexOf(".");
    const payload = decoded.slice(0, lastDot);
    const shortSig = "ab";
    const tampered = Buffer.from(`${payload}.${shortSig}`).toString("base64url");
    expect(verifySessionToken(tampered)).toBeNull();
  });

  it("отклоняет повреждённый base64", () => {
    expect(verifySessionToken("%%%")).toBeNull();
  });
});
