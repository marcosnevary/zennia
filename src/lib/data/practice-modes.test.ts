import { describe, expect, it } from "vitest";
import {
  kanaMode as buildKanaMode,
  mixedMode as buildMixedMode,
  pronouncedOf,
  rightAnswer,
  wordsMode as buildWordsMode,
  type Recorder,
  type WordsFocus,
} from "./practice-modes";
import { emptyStats, recordAnswer, recordKana } from "./stats";
import { kanaKey } from "#lib/core/kana.ts";
import type { Stats, Word } from "#lib/core/types.ts";

const typed = (reading: string, meaning = "") => ({ reading, meaning });

const recorderOf = (stats: Stats): Recorder => ({
  word: (word, verdict) => recordAnswer(stats, word, verdict),
  kana: (script, hiragana, hit) => recordKana(stats, script, hiragana, hit),
});

const wordsMode = (
  words: Word[],
  stats: Stats,
  focus: WordsFocus = "reading",
) => buildWordsMode(words, stats, focus, recorderOf(stats));

const kanaMode = (selected: string[], stats: Stats) =>
  buildKanaMode(selected, stats, recorderOf(stats));

const mixedMode = (
  words: Word[],
  selected: string[],
  stats: Stats,
  focus: WordsFocus = "reading",
) => buildMixedMode(words, selected, stats, focus, recorderOf(stats));

const word = (id: string, extra: Partial<Word> = {}): Word => ({
  id,
  japanese: id,
  hiragana: "おう",
  meaning: "",
  disabled: false,
  activatedAt: 0,
  tags: [],
  ...extra,
});

describe("wordsMode", () => {
  it("draws only active words", () => {
    const mode = wordsMode(
      [word("a"), word("b", { disabled: true })],
      emptyStats(),
    );
    expect(mode.pool.map((w) => w.id)).toEqual(["a"]);
  });

  it('reports "almost" when only the vowel length differs', () => {
    const mode = wordsMode([word("a", { hiragana: "おばさん" })], emptyStats());
    const [w] = mode.pool;
    expect(mode.check(typed("obaasan"), w)?.verdict).toBe("almost");
    expect(mode.check(typed("obasan"), w)?.verdict).toBe("correct");
  });

  it("records the verdict per word id", () => {
    const stats = emptyStats();
    const mode = wordsMode([word("a")], stats);
    mode.record(mode.pool[0], "almost");
    expect(stats.words.a).toEqual({ hits: 0, misses: 1 });
  });
});

describe("wordsMode focus", () => {
  const dog = word("dog", { hiragana: "いぬ", meaning: "dog; hound" });
  const stats = emptyStats();

  it("checks only the meaning when that is the focus", () => {
    const mode = wordsMode([dog], stats, "meaning");
    expect(mode.check(typed("", "Hound"), dog)?.verdict).toBe("correct");
    expect(mode.check(typed("", "inu"), dog)?.verdict).toBe("incorrect");
  });

  it("needs both answers to be right with the both focus", () => {
    const mode = wordsMode([dog], stats, "both");
    expect(mode.check(typed("inu", "dog"), dog)?.verdict).toBe("correct");
    expect(mode.check(typed("inu", "cat"), dog)?.verdict).toBe("incorrect");
    expect(mode.check(typed("neko", "dog"), dog)?.verdict).toBe("incorrect");
  });

  it('is "almost" with both only when the reading is almost and the meaning is right', () => {
    const aunt = word("aunt", { hiragana: "おばさん", meaning: "aunt" });
    const mode = wordsMode([aunt], stats, "both");
    expect(mode.check(typed("obaasan", "aunt"), aunt)?.verdict).toBe("almost");
    expect(mode.check(typed("obaasan", "uncle"), aunt)?.verdict).toBe(
      "incorrect",
    );
  });

  it("reports the outcome of each part for the result", () => {
    const both = wordsMode([dog], stats, "both");
    expect(both.check(typed("inu", "cat"), dog)).toEqual({
      verdict: "incorrect",
      reading: "correct",
      meaning: "incorrect",
    });
    const meaning = wordsMode([dog], stats, "meaning");
    expect(meaning.check(typed("", "hound"), dog)).toEqual({
      verdict: "correct",
      reading: null,
      meaning: "correct",
    });
    const reading = wordsMode([dog], stats, "reading");
    expect(reading.check(typed("inu"), dog)).toEqual({
      verdict: "correct",
      reading: "correct",
      meaning: null,
    });
  });

  it("checks nothing when what the focus asks for is blank", () => {
    const blank = typed("  ", " ");
    for (const focus of ["reading", "meaning", "both"] as const)
      expect(wordsMode([dog], stats, focus).check(blank, dog)).toBeNull();
    expect(
      wordsMode([dog], stats, "meaning").check(typed("inu"), dog),
    ).toBeNull();
    expect(
      wordsMode([dog], stats, "both").check(typed("", "dog"), dog),
    ).not.toBeNull();
  });
});

describe("kanaMode", () => {
  const selected = [kanaKey("hiragana", "お"), kanaKey("katakana", "お")];

  it("draws the selected symbols", () => {
    expect(kanaMode(selected, emptyStats()).pool.map((k) => k.symbol)).toEqual([
      "お",
      "オ",
    ]);
  });

  it('counts "almost" as incorrect: a single sound has no vowel-length ambiguity', () => {
    const mode = kanaMode(selected, emptyStats());
    const [o] = mode.pool;
    expect(mode.check(typed("o"), o)?.verdict).toBe("correct");
    expect(mode.check(typed("oo"), o)?.verdict).toBe("incorrect");
  });

  it("accepts either spelling of ぢ and づ", () => {
    const mode = kanaMode([kanaKey("hiragana", "ぢ")], emptyStats());
    const [di] = mode.pool;
    expect(mode.check(typed("ji"), di)?.verdict).toBe("correct");
    expect(mode.check(typed("di"), di)?.verdict).toBe("correct");
  });

  it("accepts o and wo for を, and only ha for a lone は", () => {
    const mode = kanaMode(
      [kanaKey("hiragana", "を"), kanaKey("hiragana", "は")],
      emptyStats(),
    );
    const wo = mode.pool.find((k) => k.symbol === "を")!;
    const ha = mode.pool.find((k) => k.symbol === "は")!;
    expect(mode.check(typed("o"), wo)?.verdict).toBe("correct");
    expect(mode.check(typed("wo"), wo)?.verdict).toBe("correct");
    expect(mode.check(typed("ha"), ha)?.verdict).toBe("correct");
    expect(mode.check(typed("wa"), ha)?.verdict).toBe("incorrect");
  });

  it("records per script, so hiragana and katakana stay apart", () => {
    const stats = emptyStats();
    const mode = kanaMode(selected, stats);
    mode.record(mode.pool[1], "correct");
    expect(stats.kana["katakana:お"]).toEqual({ hits: 1, misses: 0 });
    expect(stats.kana["hiragana:お"]).toBeUndefined();
  });
});

describe("mixedMode", () => {
  const kana = [kanaKey("hiragana", "お")];

  it("draws the words and the kana together, with keys that cannot collide", () => {
    const mode = mixedMode([word("お")], kana, emptyStats());
    expect(mode.pool.map((item) => item.kind)).toEqual(["word", "kana"]);
    expect(mode.pool.map(mode.keyOf)).toEqual(["word:お", "kana:お"]);
  });

  it("checks each item by its own rules", () => {
    const mode = mixedMode(
      [word("a", { hiragana: "おばさん" })],
      kana,
      emptyStats(),
    );
    const [w, k] = mode.pool;
    expect(mode.check(typed("obaasan"), w)?.verdict).toBe("almost");
    expect(mode.check(typed("o"), k)?.verdict).toBe("correct");
    expect(mode.check(typed("oo"), k)?.verdict).toBe("incorrect");
  });

  it("records words and kana in their own stats", () => {
    const stats = emptyStats();
    const mode = mixedMode([word("a")], kana, stats);
    mode.record(mode.pool[0], "correct");
    mode.record(mode.pool[1], "incorrect");
    expect(stats.words.a).toEqual({ hits: 1, misses: 0 });
    expect(stats.kana["hiragana:お"]).toEqual({ hits: 0, misses: 1 });
  });
});

describe("rightAnswer", () => {
  it("shows a word with furigana and romaji on each run, its romaji and meaning", () => {
    const item = {
      kind: "word",
      word: word("食べる", { hiragana: "たべる", meaning: "to eat" }),
    } as const;
    expect(rightAnswer(item)).toEqual({
      written: [
        { text: "食", reading: "た", romaji: "ta" },
        { text: "べる", romaji: "beru" },
      ],
      romaji: "taberu",
      meaning: "to eat",
    });
  });

  it("puts the hiragana above a katakana, and has no meaning for kana", () => {
    const [hiragana, katakana] = mixedMode(
      [],
      [kanaKey("hiragana", "あ"), kanaKey("katakana", "あ")],
      emptyStats(),
    ).pool;
    expect(rightAnswer(hiragana)).toEqual({
      written: [{ text: "あ", romaji: "a" }],
      romaji: "a",
      meaning: undefined,
    });
    expect(rightAnswer(katakana)).toEqual({
      written: [{ text: "ア", reading: "あ", romaji: "a" }],
      romaji: "a",
      meaning: undefined,
    });
  });

  it("shows the particle は of a greeting as wa", () => {
    const item = {
      kind: "word",
      word: word("こんにちは", { hiragana: "こんにちは", meaning: "hello" }),
    } as const;
    expect(rightAnswer(item)).toEqual({
      written: [{ text: "こんにちは", romaji: "konnichiwa" }],
      romaji: "konnichiwa",
      meaning: "hello",
    });
  });
});

describe("pronouncedOf", () => {
  it("says the particle は of a greeting as わ", () => {
    const item = {
      kind: "word",
      word: word("今日は", { hiragana: "こんにちは" }),
    } as const;
    expect(pronouncedOf(item)).toEqual({
      written: "今日は",
      reading: "こんにちわ",
    });
  });
});
