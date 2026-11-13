import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { isKana } from "wanakana";
import { kanaList, wordItemKey, type WordListItem } from "./lists";

describe("kanaList", () => {
  it("has every kana of the Kana tab, in its order", () => {
    const keys = kanaList("katakana").items.map((i) => i.key);
    expect(keys).toHaveLength(107);
    expect(keys.slice(0, 2)).toEqual(["kana:katakana:あ", "kana:katakana:い"]);
    expect(keys.indexOf("kana:katakana:ん")).toBeLessThan(
      keys.indexOf("kana:katakana:が"),
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

describe("static/lists/n5.json", () => {
  const n5: { id: string; items: WordListItem[] } = JSON.parse(
    readFileSync(
      new URL("../../../static/lists/n5.json", import.meta.url),
      "utf8",
    ),
  );

  it("keys each word by its written form and reading, once", () => {
    expect(n5.id).toBe("n5");
    for (const item of n5.items) {
      expect(item.key).toBe(wordItemKey(item.japanese, item.hiragana));
    }
    expect(new Set(n5.items.map((item) => item.key)).size).toBe(
      n5.items.length,
    );
  });

  it("has a kana reading and a meaning for every word", () => {
    for (const item of n5.items) {
      expect(isKana(item.hiragana), item.key).toBe(true);
      expect(item.meaning.trim(), item.key).not.toBe("");
    }
  });
});
