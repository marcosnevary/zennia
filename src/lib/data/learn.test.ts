import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  HITS_TO_KNOW,
  introduce,
  kanaList,
  learningCount,
  recordProgress,
  type List,
  type ListId,
  type Progress,
} from "./learn";

/** A list whose groups have the given sizes, with keys like "hiragana:1.0". */
function list(id: ListId, sizes: number[]): List {
  return {
    id,
    items: sizes.flatMap((size, group) =>
      Array.from({ length: size }, (_, i) => ({
        key: `${id}:${group}.${i}`,
        group,
      })),
    ),
  };
}

function know(progress: Progress, keys: string[]): void {
  for (const key of keys) {
    for (let i = 0; i < HITS_TO_KNOW; i++) recordProgress(progress, key, true);
  }
}

describe("introduce", () => {
  it("starts with the first group of the first list", () => {
    const progress: Progress = {};
    const path = [list("hiragana", [5, 5]), list("katakana", [5])];
    expect(introduce(path, progress, 100)).toEqual({
      keys: [
        "hiragana:0.0",
        "hiragana:0.1",
        "hiragana:0.2",
        "hiragana:0.3",
        "hiragana:0.4",
      ],
      started: ["hiragana"],
    });
    expect(progress["hiragana:0.0"]).toEqual({
      state: "learning",
      streak: 0,
      introducedAt: 100,
    });
  });

  it("adds nothing while enough items are learning", () => {
    const progress: Progress = {};
    const path = [list("hiragana", [5, 5])];
    introduce(path, progress, 0);
    expect(introduce(path, progress, 1)).toEqual({ keys: [], started: [] });
  });

  it("adds the next group once fewer than 5 items are learning", () => {
    const progress: Progress = {};
    const path = [list("hiragana", [5, 5, 5])];
    introduce(path, progress, 0);
    know(progress, ["hiragana:0.0"]);
    expect(introduce(path, progress, 1).keys).toEqual([
      "hiragana:1.0",
      "hiragana:1.1",
      "hiragana:1.2",
      "hiragana:1.3",
      "hiragana:1.4",
    ]);
    expect(learningCount(progress)).toBe(9);
  });

  it("adds small groups until enough items are learning", () => {
    const progress: Progress = {};
    const path = [list("hiragana", [3, 2, 5])];
    expect(introduce(path, progress, 0).keys).toHaveLength(5);
    expect(progress["hiragana:2.0"]).toBeUndefined();
  });

  it("starts the next list when one has no new items, counting learning items of both", () => {
    const progress: Progress = {};
    const path = [list("hiragana", [5, 3]), list("katakana", [5])];
    introduce(path, progress, 0);
    know(progress, ["hiragana:0.0", "hiragana:0.1", "hiragana:0.2"]);
    // 2 learning: the last hiragana group brings it to 5
    expect(introduce(path, progress, 1)).toEqual({
      keys: ["hiragana:1.0", "hiragana:1.1", "hiragana:1.2"],
      started: [],
    });
    know(progress, ["hiragana:0.3"]);
    // 4 learning hiragana items stay, mixed with the first katakana group
    expect(introduce(path, progress, 2)).toEqual({
      keys: [
        "katakana:0.0",
        "katakana:0.1",
        "katakana:0.2",
        "katakana:0.3",
        "katakana:0.4",
      ],
      started: ["katakana"],
    });
    expect(progress["hiragana:1.0"].state).toBe("learning");
  });

  it("introduces nothing once the path has no new items", () => {
    const progress: Progress = {};
    const path = [list("hiragana", [2]), list("katakana", [2])];
    introduce(path, progress, 0);
    know(progress, Object.keys(progress));
    expect(introduce(path, progress, 1)).toEqual({ keys: [], started: [] });
  });
});

describe("recordProgress", () => {
  it("makes an item known after 3 hits in a row", () => {
    const progress: Progress = {
      a: { state: "learning", streak: 0, introducedAt: 0 },
    };
    recordProgress(progress, "a", true);
    recordProgress(progress, "a", true);
    expect(progress.a).toMatchObject({ state: "learning", streak: 2 });
    recordProgress(progress, "a", true);
    expect(progress.a).toMatchObject({ state: "known", streak: 3 });
  });

  it("resets the streak on a miss and keeps the item learning", () => {
    const progress: Progress = {
      a: { state: "learning", streak: 2, introducedAt: 0 },
    };
    recordProgress(progress, "a", false);
    expect(progress.a).toMatchObject({ state: "learning", streak: 0 });
    recordProgress(progress, "a", true);
    recordProgress(progress, "a", true);
    expect(progress.a.state).toBe("learning");
  });

  it("sends a known item back to learning on a miss", () => {
    const progress: Progress = {
      a: { state: "known", streak: 7, introducedAt: 0 },
    };
    recordProgress(progress, "a", false);
    expect(progress.a).toMatchObject({ state: "learning", streak: 0 });
  });

  it("ignores items that were never introduced", () => {
    const progress: Progress = {};
    recordProgress(progress, "a", true);
    expect(progress).toEqual({});
  });
});

describe("kanaList", () => {
  it("has every kana of the Kana tab, one row per group", () => {
    const { items } = kanaList("hiragana");
    expect(items).toHaveLength(107);
    expect(items.slice(0, 6)).toEqual([
      { key: "kana:hiragana:あ", group: 0 },
      { key: "kana:hiragana:い", group: 0 },
      { key: "kana:hiragana:う", group: 0 },
      { key: "kana:hiragana:え", group: 0 },
      { key: "kana:hiragana:お", group: 0 },
      { key: "kana:hiragana:か", group: 1 },
    ]);
    expect(items.filter((i) => i.group === 7).map((i) => i.key)).toEqual([
      "kana:hiragana:や",
      "kana:hiragana:ゆ",
      "kana:hiragana:よ",
    ]);
  });

  it("puts dakuten after the basic kana and combinations last", () => {
    const keys = kanaList("katakana").items.map((i) => i.key);
    expect(keys.indexOf("kana:katakana:ん")).toBeLessThan(
      keys.indexOf("kana:katakana:が"),
    );
    expect(keys.indexOf("kana:katakana:ぽ")).toBeLessThan(
      keys.indexOf("kana:katakana:きゃ"),
    );
    expect(keys.at(-1)).toBe("kana:katakana:ぴょ");
  });

  it.each(["hiragana", "katakana"] as const)(
    "matches static/lists/%s.json (rebuild with node scripts/build-kana-lists.ts)",
    (script) => {
      const file = new URL(
        `../../../static/lists/${script}.json`,
        import.meta.url,
      );
      expect(JSON.parse(readFileSync(file, "utf8"))).toEqual(kanaList(script));
    },
  );
});
