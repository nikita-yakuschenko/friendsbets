import { describe, expect, it } from "vitest";
import {
  absoluteAppUrl,
  getAppOriginFromEnv,
  getAppOriginFromHeaders,
} from "@/lib/app-origin";

describe("app-origin", () => {
  it("getAppOriginFromEnv strips trailing slash", () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://friendsbets.ru/";
    expect(getAppOriginFromEnv()).toBe("https://friendsbets.ru");
  });

  it("getAppOriginFromHeaders prefers x-forwarded-host", () => {
    const headers = new Headers({
      "x-forwarded-host": "friendsbets.ru",
      "x-forwarded-proto": "https",
      host: "localhost:3000",
    });
    expect(getAppOriginFromHeaders(headers)).toBe("https://friendsbets.ru");
  });

  it("getAppOriginFromHeaders falls back to env for internal host", () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://friendsbets.ru";
    const headers = new Headers({ host: "localhost:3000" });
    expect(getAppOriginFromHeaders(headers)).toBe("https://friendsbets.ru");
  });

  it("absoluteAppUrl builds path on origin", () => {
    expect(absoluteAppUrl("/reset-password?token=abc", "https://friendsbets.ru")).toBe(
      "https://friendsbets.ru/reset-password?token=abc",
    );
  });
});
