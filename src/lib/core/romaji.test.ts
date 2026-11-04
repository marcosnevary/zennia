import { describe, expect, it } from "vitest";
import {
  checkAnswer,
  soundKeys,
  toDisplayRomaji,
  toDisplayRomajiRuns,
  typedSoundKeys,
} from "./romaji";

describe("checkAnswer: accepts spelling-system variations", () => {
  it("exact romaji", () => {
    expect(checkAnswer("taberu", "たべる")).toBe("correct");
  });
  it("uppercase and extra spaces", () => {
    expect(checkAnswer("  Taberu ", "たべる")).toBe("correct");
  });
  it("shi/si, chi/ti, tsu/tu, fu/hu, ji/zi", () => {
    expect(checkAnswer("sushi", "すし")).toBe("correct");
    expect(checkAnswer("susi", "すし")).toBe("correct");
    expect(checkAnswer("chikatetsu", "ちかてつ")).toBe("correct");
    expect(checkAnswer("tikatetu", "ちかてつ")).toBe("correct");
    expect(checkAnswer("huro", "ふろ")).toBe("correct");
    expect(checkAnswer("zikan", "じかん")).toBe("correct");
  });
  it("macron accepts any expansion", () => {
    expect(checkAnswer("tōkyō", "とうきょう")).toBe("correct");
    expect(checkAnswer("ōkii", "おおきい")).toBe("correct");
    expect(checkAnswer("ōsaka", "おおさか")).toBe("correct");
  });
  it("katakana saved as hiragana or with ー", () => {
    expect(checkAnswer("koohii", "コーヒー")).toBe("correct");
    expect(checkAnswer("ko-hi-", "こーひー")).toBe("correct");
    expect(checkAnswer("koohii", "こおひい")).toBe("correct");
  });
  it("ん before a vowel and gemination", () => {
    expect(checkAnswer("kin'en", "きんえん")).toBe("correct");
    expect(checkAnswer("kinen", "きねん")).toBe("correct");
    expect(checkAnswer("nn", "ん")).toBe("correct");
    expect(checkAnswer("kann", "かん")).toBe("correct");
    expect(checkAnswer("konnnichiha", "こんにちは")).toBe("incorrect");
    expect(checkAnswer("gakkou", "がっこう")).toBe("correct");
  });
  it("kana with the same sound", () => {
    expect(checkAnswer("tsuzuku", "つづく")).toBe("correct");
    expect(checkAnswer("tsuduku", "つづく")).toBe("correct");
    expect(checkAnswer("hanaji", "はなぢ")).toBe("correct");
    expect(checkAnswer("hanadi", "はなぢ")).toBe("correct");
    expect(checkAnswer("o", "を")).toBe("correct");
    expect(checkAnswer("wo", "を")).toBe("correct");
  });
  it("the tch spelling of っち", () => {
    expect(checkAnswer("kotchi", "こっち")).toBe("correct");
    expect(checkAnswer("kocchi", "こっち")).toBe("correct");
  });
  it("foreign sounds", () => {
    expect(checkAnswer("aatisuto", "アーティスト")).toBe("correct");
    expect(checkAnswer("fairu", "ファイル")).toBe("correct");
    expect(checkAnswer("wiiku", "ウィーク")).toBe("correct");
  });
  it("a final は as わ, only in a longer word", () => {
    expect(checkAnswer("konnichiwa", "こんにちは")).toBe("correct");
    expect(checkAnswer("konnichiha", "こんにちは")).toBe("correct");
    expect(checkAnswer("wa", "は")).toBe("incorrect");
    expect(checkAnswer("wana", "はな")).toBe("incorrect");
  });
});

describe("checkAnswer: long vowel and errors", () => {
  it("only the vowel length differs → almost", () => {
    expect(checkAnswer("tokyo", "とうきょう")).toBe("almost");
    expect(checkAnswer("obasan", "おばあさん")).toBe("almost");
    expect(checkAnswer("yuki", "ゆうき")).toBe("almost");
    expect(checkAnswer("biru", "ビール")).toBe("almost");
  });
  it("different words → incorrect", () => {
    expect(checkAnswer("nomu", "たべる")).toBe("incorrect");
    expect(checkAnswer("", "たべる")).toBe("incorrect");
    expect(checkAnswer("食べる", "たべる")).toBe("incorrect");
  });
});

describe("toDisplayRomaji", () => {
  it("generates romaji from hiragana", () => {
    expect(toDisplayRomaji("たべる")).toBe("taberu");
    expect(toDisplayRomaji("がっこう")).toBe("gakkou");
    expect(toDisplayRomaji("コーヒー")).toBe("koohii");
  });
  it("spells foreign sounds as one sound", () => {
    expect(toDisplayRomaji("アーティスト")).toBe("aatisuto");
    expect(toDisplayRomaji("ファイル")).toBe("fairu");
    expect(toDisplayRomaji("ピッツァ")).toBe("pittsa");
    expect(toDisplayRomaji("フィッティング")).toBe("fittingu");
    expect(toDisplayRomaji("ゴールデンウィーク")).toBe("goorudenwiiku");
  });
  it("keeps the usual spelling of を and つづく", () => {
    expect(toDisplayRomaji("を")).toBe("wo");
    expect(toDisplayRomaji("つづく")).toBe("tsuzuku");
  });
});

describe("toDisplayRomajiRuns", () => {
  it("gives each run its own romaji", () => {
    expect(toDisplayRomajiRuns(["た", "べる"])).toEqual(["ta", "beru"]);
  });
  it("gives the consonant doubled by っ to the next run", () => {
    expect(toDisplayRomajiRuns(["ひ", "っ", "こ", "し"])).toEqual([
      "hi",
      "",
      "kko",
      "shi",
    ]);
  });
  it("drops the apostrophe after ん between runs", () => {
    expect(toDisplayRomajiRuns(["きん", "えん"])).toEqual(["kin", "en"]);
  });
});

describe("typedSoundKeys", () => {
  it("matches the soundKeys of every reading that checkAnswer accepts as correct or almost", () => {
    const finds = (typed: string, reading: string) =>
      typedSoundKeys(typed).some((key) => soundKeys(reading).includes(key));
    expect(finds("tōkyō", "とうきょう")).toBe(true);
    expect(finds("tokyo", "とうきょう")).toBe(true);
    expect(finds("koohii", "コーヒー")).toBe(true);
    expect(finds("tsuzuku", "つづく")).toBe(true);
    expect(finds("konnichiwa", "こんにちは")).toBe(true);
    expect(finds("aatisuto", "アーティスト")).toBe(true);
    expect(finds("neko", "ねご")).toBe(false);
  });
});
