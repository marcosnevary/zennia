import { describe, expect, it } from "vitest";
import { nextFont, practiceFontsFrom } from "./practice-fonts";

describe("nextFont", () => {
  it("never repeats the previous font", () => {
    const chosen = ["default", "klee-one", "yomogi"] as const;
    for (const previous of chosen) {
      for (const r of [0, 0.5, 0.999]) {
        expect(nextFont(chosen, previous, () => r)).not.toBe(previous);
      }
    }
  });

  it("can draw any chosen font when there is no previous one", () => {
    const chosen = ["default", "klee-one", "yomogi"] as const;
    expect(
      chosen.map((_, i) => nextFont(chosen, undefined, () => i / 3)),
    ).toEqual([...chosen]);
  });

  it("keeps the only chosen font", () => {
    expect(nextFont(["klee-one"], "klee-one")).toBe("klee-one");
  });
});

describe("practiceFontsFrom", () => {
  it("keeps the known fonts once, in list order", () => {
    expect(
      practiceFontsFrom(["yomogi", "comic-sans", "default", "yomogi"]),
    ).toEqual(["default", "yomogi"]);
  });

  it("reads anything else as no fonts", () => {
    expect(practiceFontsFrom(null)).toEqual([]);
    expect(practiceFontsFrom("yomogi")).toEqual([]);
  });
});
