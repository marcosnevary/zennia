import { describe, expect, it } from "vitest";
import {
  isPronounceable,
  pronunciationPath,
  pronunciationSsml,
} from "./pronunciation.ts";

describe("isPronounceable", () => {
  it("accepts a word with a kana reading", () => {
    expect(isPronounceable({ written: "一日", reading: "ついたち" })).toBe(
      true,
    );
    expect(isPronounceable({ written: "コーヒー", reading: "こーひー" })).toBe(
      true,
    );
    expect(isPronounceable({ written: "カ", reading: "か" })).toBe(true);
  });

  it("rejects a reading that isn't kana, and empty or long text", () => {
    expect(isPronounceable({ written: "猫", reading: "neko" })).toBe(false);
    expect(isPronounceable({ written: "猫", reading: "" })).toBe(false);
    expect(isPronounceable({ written: "", reading: "ねこ" })).toBe(false);
    expect(isPronounceable({ written: "猫".repeat(33), reading: "ねこ" })).toBe(
      false,
    );
  });
});

describe("pronunciationPath", () => {
  it("is the same for the same word and differs by reading", async () => {
    const a = await pronunciationPath({ written: "一日", reading: "ついたち" });
    expect(a).toMatch(/^ja-JP-NanamiNeural\/[0-9a-f]{64}\.mp3$/);
    expect(
      await pronunciationPath({ written: "一日", reading: "ついたち" }),
    ).toBe(a);
    expect(
      await pronunciationPath({ written: "一日", reading: "いちにち" }),
    ).not.toBe(a);
  });
});

describe("pronunciationSsml", () => {
  it("says the reading in katakana, keeping the written form", () => {
    expect(
      pronunciationSsml({ written: "一日", reading: "ついたち" }),
    ).toContain('<phoneme alphabet="sapi" ph="ツイタチ">一日</phoneme>');
    expect(
      pronunciationSsml({ written: "コーヒー", reading: "こーひー" }),
    ).toContain('ph="コーヒー"');
  });

  it("escapes the written form", () => {
    expect(pronunciationSsml({ written: "<&>", reading: "あ" })).toContain(
      ">&lt;&amp;&gt;</phoneme>",
    );
  });
});
