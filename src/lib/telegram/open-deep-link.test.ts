import { afterEach, describe, expect, it, vi } from "vitest";
import {
  isMobileTelegramLinkContext,
  openTelegramDeepLink,
} from "@/lib/telegram/open-deep-link";

describe("openTelegramDeepLink", () => {
  const url = "https://t.me/friendsbets_bot?start=link_abc";

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("на iPhone использует location.assign", () => {
    vi.stubGlobal("navigator", {
      userAgent:
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15",
    });
    const assign = vi.fn();
    vi.stubGlobal("location", { assign });
    const open = vi.fn();
    vi.stubGlobal("open", open);

    openTelegramDeepLink(url);

    expect(assign).toHaveBeenCalledWith(url);
    expect(open).not.toHaveBeenCalled();
  });

  it("на десктопе пробует window.open", () => {
    vi.stubGlobal("navigator", {
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    });
    const assign = vi.fn();
    vi.stubGlobal("location", { assign });
    const open = vi.fn().mockReturnValue({});
    vi.stubGlobal("open", open);

    openTelegramDeepLink(url);

    expect(open).toHaveBeenCalledWith(url, "_blank", "noopener,noreferrer");
    expect(assign).not.toHaveBeenCalled();
  });

  it("на десктопе fallback если popup заблокирован", () => {
    vi.stubGlobal("navigator", {
      userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
    });
    const assign = vi.fn();
    vi.stubGlobal("location", { assign });
    vi.stubGlobal("open", vi.fn().mockReturnValue(null));

    openTelegramDeepLink(url);

    expect(assign).toHaveBeenCalledWith(url);
  });
});

describe("isMobileTelegramLinkContext", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("определяет Android", () => {
    vi.stubGlobal("navigator", { userAgent: "Mozilla/5.0 (Linux; Android 14)" });
    expect(isMobileTelegramLinkContext()).toBe(true);
  });
});
