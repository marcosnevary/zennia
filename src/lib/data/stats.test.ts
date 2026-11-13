import { describe, expect, it } from "vitest";
import type { SortDirection } from "./words";
import {
  accuracy,
  accuracyLevel,
  totalTally,
  emptyStats,
  recordAnswer,
  recordKana,
  sortTallies,
  type StatsSort,
} from "./stats";
import type { Word } from "#lib/core/types.ts";

const word: Word = {
  id: "w1",
  japanese: "食べる",
  hiragana: "たべる",
  meaning: "",
  disabled: false,
  activatedAt: 0,
  tags: [],
};

describe("recordAnswer", () => {
  it("counts only the word, never the kana inside it", () => {
    const stats = emptyStats();
    recordAnswer(stats, word, "correct");
    recordAnswer(stats, word, "incorrect");
    recordAnswer(stats, word, "almost");
    expect(stats.words.w1).toMatchObject({ hits: 1, misses: 2 });
    expect(stats.kana).toEqual({});
  });
});

describe("recordKana", () => {
  it("keeps hiragana and katakana apart", () => {
    const stats = emptyStats();
    recordKana(stats, "katakana", "か", false);
    recordKana(stats, "hiragana", "か", true);
    recordKana(stats, "hiragana", "か", true);
    expect(stats.kana["katakana:か"]).toMatchObject({ hits: 0, misses: 1 });
    expect(stats.kana["hiragana:か"]).toMatchObject({ hits: 2, misses: 0 });
    expect(stats.words).toEqual({});
  });
});

describe("totalTally", () => {
  it("adds the words and the kana together", () => {
    const stats = emptyStats();
    recordAnswer(stats, word, "correct");
    recordAnswer(stats, word, "almost");
    recordKana(stats, "hiragana", "か", true);
    recordKana(stats, "katakana", "か", false);
    expect(totalTally(stats)).toEqual({ hits: 2, misses: 2 });
    expect(totalTally(emptyStats())).toEqual({ hits: 0, misses: 0 });
  });
});

describe("accuracyLevel", () => {
  it("is high from 80%, low under 60%, neutral in between", () => {
    expect(accuracyLevel({ hits: 4, misses: 1 })).toBe("high");
    expect(accuracyLevel({ hits: 3, misses: 2 })).toBe("");
    expect(accuracyLevel({ hits: 3, misses: 1 })).toBe("");
    expect(accuracyLevel({ hits: 1, misses: 1 })).toBe("low");
  });
  it("is neutral without answers", () => {
    expect(accuracyLevel({ hits: 0, misses: 0 })).toBe("");
  });
});

describe("accuracy and sorting", () => {
  it("accuracy is null without answers", () => {
    expect(accuracy({ hits: 0, misses: 0 })).toBeNull();
    expect(accuracy({ hits: 3, misses: 1 })).toBe(0.75);
  });
  it("sorts by misses, accuracy and hits in either direction", () => {
    const entries = [
      { key: "a", tally: { hits: 9, misses: 3 } },
      { key: "b", tally: { hits: 1, misses: 2 } },
      { key: "c", tally: { hits: 5, misses: 0 } },
    ];
    const keys = (sort: StatsSort, direction: SortDirection) =>
      sortTallies(entries, sort, direction).map((e) => e.key);
    expect(keys("misses", "desc")).toEqual(["a", "b", "c"]);
    expect(keys("accuracy", "asc")).toEqual(["b", "a", "c"]);
    expect(keys("hits", "desc")).toEqual(["a", "c", "b"]);
    expect(keys("misses", "asc")).toEqual(["c", "b", "a"]);
  });
});
