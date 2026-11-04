import { toHiragana, toRomaji } from "wanakana";
import type { Verdict } from "./types";

const VOWEL_KANA: Record<string, string> = {
  a: "あ",
  i: "い",
  u: "う",
  e: "え",
  o: "お",
};

/** Each macron vowel can be written in more than one way in kana. */
const MACRONS: Record<string, string[]> = {
  ā: ["aa"],
  ī: ["ii"],
  ū: ["uu"],
  ē: ["ei", "ee"],
  ō: ["ou", "oo"],
};

const MAX_CANDIDATES = 256;

/** wanakana spells these kana one by one (ティ as "tei", ファ as "fua"), which is not how they sound or are written in romaji. */
const SINGLE_FOREIGN_SOUNDS: [kana: string, romaji: string][] = [
  ["てぃ", "ti"],
  ["でぃ", "di"],
  ["とぅ", "tu"],
  ["どぅ", "du"],
  ["でゅ", "dyu"],
  ["ふぁ", "fa"],
  ["ふぃ", "fi"],
  ["ふぇ", "fe"],
  ["ふぉ", "fo"],
  ["うぃ", "wi"],
  ["うぇ", "we"],
  ["うぉ", "wo"],
  ["つぁ", "tsa"],
  ["つぃ", "tsi"],
  ["つぇ", "tse"],
  ["つぉ", "tso"],
  ["ゔぁ", "va"],
  ["ゔぃ", "vi"],
  ["ゔぇ", "ve"],
  ["ゔぉ", "vo"],
];

/** Also after っ and ん, which wanakana would otherwise resolve first, splitting the sound again. */
const FOREIGN_SOUNDS = Object.fromEntries(
  SINGLE_FOREIGN_SOUNDS.flatMap(([kana, romaji]) => [
    [kana, romaji],
    [`っ${kana}`, `${romaji[0]}${romaji}`],
    [`ん${kana}`, `n${romaji}`],
  ]),
);

function romajiOf(kana: string): string {
  return toRomaji(kana, { customRomajiMapping: FOREIGN_SOUNDS });
}

/** Expands macrons into every possible spelling (ō → ou / oo). */
function expandMacrons(text: string): string[] {
  let results = [""];
  for (const ch of text) {
    const options = MACRONS[ch] ?? [ch];
    const next: string[] = [];
    for (const prefix of results) {
      for (const option of options) next.push(prefix + option);
    }
    results = next.slice(0, MAX_CANDIDATES);
  }
  return results;
}

/**
 * Converts to hiragana and replaces the long vowel mark (ー) with the
 * matching vowel, so that こーひー and こおひい are the same sound.
 */
export function normalizeKana(text: string): string {
  // wanakana converts ー to う in the o row; here we always use the same vowel
  const hira = toHiragana(text.replace(/\s+/g, ""), {
    convertLongVowelMark: false,
  });
  let out = "";
  for (const ch of hira) {
    if (ch === "ー" && out) {
      const prev = [...out].at(-1)!;
      const vowel = toRomaji(prev).match(/[aiueo]$/)?.[0];
      out += vowel ? VOWEL_KANA[vowel] : ch;
    } else {
      out += ch;
    }
  }
  return out;
}

/** A sound ignoring vowel length, which is what "almost" and the dictionary lookup compare. */
function skeleton(sound: string): string {
  return sound
    .replace(/aa/g, "a")
    .replace(/ii/g, "i")
    .replace(/uu/g, "u")
    .replace(/ee|ei/g, "e")
    .replace(/oo|ou/g, "o");
}

/** Romaji reaches kana that sound the same (づ and ず, ぢ and じ) on its own; を and お need this. */
function soundOf(kana: string): string {
  return romajiOf(kana.replace(/を/g, "お"));
}

/** Every sound a saved reading can have. A final は in a longer word is read as わ, as in こんにちは. */
function readingSounds(reading: string): string[] {
  const kana = normalizeKana(reading);
  return [...kana].length > 1 && kana.endsWith("は")
    ? [soundOf(kana), soundOf(`${kana.slice(0, -1)}わ`)]
    : [soundOf(kana)];
}

/**
 * Every sound the typed text may stand for. The text itself counts as one: typed "ti" converts to ち,
 * yet it is also how ティ is written.
 */
function typedSounds(input: string): string[] {
  const typed = expandMacrons(input.trim().toLowerCase());
  // "nn" at the end of a word is a common way to type ん
  const variants = typed.flatMap((t) =>
    t.endsWith("nn") ? [t, t.slice(0, -1)] : [t],
  );
  return variants.flatMap((t) => [
    t.replace(/\s+/g, ""),
    soundOf(normalizeKana(t)),
  ]);
}

/** The keys of a reading: shared with the kana that sound the same ignoring vowel length, the ones `checkAnswer` accepts as correct or almost. */
export function soundKeys(reading: string): string[] {
  return readingSounds(reading).map(skeleton);
}

/** The `soundKeys` of what was typed, to find the words it may stand for. */
export function typedSoundKeys(input: string): string[] {
  return [...new Set(typedSounds(input).map(skeleton))];
}

/**
 * Compares what was typed with the saved reading.
 * - correct: same sound (accepts shi/si, chi/ti, tsu/tu, fu/hu, ji/di, zu/du, o/wo, macrons, uppercase)
 * - almost: only the length of some vowel differs
 * - incorrect: any other difference
 */
export function checkAnswer(input: string, hiragana: string): Verdict {
  if (!input.trim()) return "incorrect";

  const sounds = readingSounds(hiragana);
  const typed = typedSounds(input);

  if (typed.some((t) => sounds.includes(t))) return "correct";

  const keys = sounds.map(skeleton);
  if (typed.some((t) => keys.includes(skeleton(t)))) return "almost";

  return "incorrect";
}

/** Romaji shown in the answer: derived from the hiragana, never saved. */
export function toDisplayRomaji(hiragana: string): string {
  return romajiOf(normalizeKana(hiragana));
}

/**
 * The display romaji of each run of a word, matching the romaji of the whole word.
 * Each run gets what it adds to the romaji of the runs before it, since っ doubles the consonant of the
 * next run. The apostrophe after ん is dropped: the runs are shown apart, so ne and n·e can't be confused.
 */
export function toDisplayRomajiRuns(runs: string[]): string[] {
  let before = "";
  return runs.map((_, i) => {
    const upTo = toDisplayRomaji(runs.slice(0, i + 1).join(""));
    const own = upTo.startsWith(before)
      ? upTo.slice(before.length)
      : toDisplayRomaji(runs[i]);
    before = upTo;
    return own.replace(/^'/, "");
  });
}
