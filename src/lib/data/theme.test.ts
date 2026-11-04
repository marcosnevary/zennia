import { afterEach, describe, expect, it, vi } from "vitest";
import { readThemeCache, resolveTheme } from "./theme";

describe("readThemeCache", () => {
  afterEach(() => vi.unstubAllGlobals());

  const cached = (value: string | null) =>
    vi.stubGlobal("localStorage", { getItem: () => value });

  it("reads a saved theme", () => {
    cached('"dark"');
    expect(readThemeCache()).toBe("dark");
    cached('"light"');
    expect(readThemeCache()).toBe("light");
  });

  it("falls back to system without a valid saved theme", () => {
    cached(null);
    expect(readThemeCache()).toBe("system");
    cached('"sepia"');
    expect(readThemeCache()).toBe("system");
    cached("not json");
    expect(readThemeCache()).toBe("system");
  });
});

describe("resolveTheme", () => {
  it("follows the system when the preference is system", () => {
    expect(resolveTheme("system", true)).toBe("dark");
    expect(resolveTheme("system", false)).toBe("light");
  });

  it("ignores the system for an explicit preference", () => {
    expect(resolveTheme("light", true)).toBe("light");
    expect(resolveTheme("dark", false)).toBe("dark");
  });
});
