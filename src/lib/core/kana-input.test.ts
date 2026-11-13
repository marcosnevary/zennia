import { describe, expect, it } from "vitest";
import { editedRomaji, typedKana } from "./kana-input";
import { checkAnswer } from "./romaji";

describe("typedKana", () => {
  it("converts romaji to hiragana", () => {
    expect(typedKana("taberu")).toBe("たべる");
    expect(typedKana("Kyou")).toBe("きょう");
    expect(typedKana("ko-hi-")).toBe("こーひー");
  });
  it("keeps an unfinished syllable as romaji", () => {
    expect(typedKana("tabe k")).toBe("たべ k");
    expect(typedKana("ky")).toBe("ky");
  });
  it("shows a final n as ん until a vowel turns it into な", () => {
    expect(typedKana("kan")).toBe("かん");
    expect(typedKana("kana")).toBe("かな");
    expect(typedKana("n")).toBe("ん");
  });
  it("reads a final nn as ん, and a double n before a vowel as んな", () => {
    expect(typedKana("kann")).toBe("かん");
    expect(typedKana("minna")).toBe("みんな");
    expect(typedKana("kan'i")).toBe("かんい");
  });
});

/** Types `text` one character at a time into a field that shows `typedKana`. */
function typeIn(romaji: string, text: string): string {
  for (const char of text)
    romaji = editedRomaji(romaji, typedKana(romaji) + char);
  return romaji;
}

/** Deletes the last character the field shows. */
function backspace(romaji: string): string {
  return editedRomaji(romaji, [...typedKana(romaji)].slice(0, -1).join(""));
}

describe("editedRomaji", () => {
  it("keeps what was typed at the end as romaji", () => {
    expect(typeIn("", "konnichiwa")).toBe("konnichiwa");
    expect(typeIn("", "ti")).toBe("ti");
    expect(typeIn("", "kana")).toBe("kana");
    expect(typeIn("", "minna")).toBe("minna");
  });
  it("keeps the romaji behind the kana, so ti still answers ティ", () => {
    const romaji = typeIn("", "paatii");
    expect(typedKana(romaji)).toBe("ぱあちい");
    expect(checkAnswer(romaji, "パーティー")).toBe("correct");
  });
  it("drops the romaji of the last kana on backspace", () => {
    expect(backspace("taberu")).toBe("tabe");
    expect(backspace("kan")).toBe("ka");
    expect(backspace("kyou")).toBe("kyo");
  });
  it("keeps the shown kana where the romaji can't be split", () => {
    expect(backspace("kyo")).toBe("き");
    expect(backspace("chotto")).toBe("choっ");
  });
  it("keeps the field's text after the first changed kana", () => {
    expect(editedRomaji("taberu", "たxべる")).toBe("taxべる");
    expect(editedRomaji("taberu", "のむ")).toBe("のむ");
  });
  it("takes kana typed with a Japanese keyboard as it is", () => {
    expect(editedRomaji("", "たべる")).toBe("たべる");
    expect(checkAnswer("たべる", "たべる")).toBe("correct");
  });
});
