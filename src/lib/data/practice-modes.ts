import type { Pronounced } from "#functions/_shared/pronunciation.ts";
import { furigana, type FuriganaPart } from "#lib/core/furigana.ts";
import {
  buildKana,
  kanaKey,
  type Kana,
  type KanaScript,
} from "#lib/core/kana.ts";
import { checkMeaning } from "#lib/core/meaning.ts";
import {
  checkAnswer,
  toDisplayRomaji,
  toDisplayRomajiRuns,
} from "#lib/core/romaji.ts";
import type { Stats, Verdict, Word } from "#lib/core/types.ts";
import type { Outcome, PracticeMode, TypedAnswer } from "./practice-session";
import { drawWeight } from "./stats";

/** What is typed for a word: its reading, its meaning or both. */
export type WordsFocus = "reading" | "meaning" | "both";

export const WORDS_FOCUSES: { id: WordsFocus; label: string }[] = [
  { id: "reading", label: "Reading" },
  { id: "meaning", label: "Meaning" },
  { id: "both", label: "Both" },
];

function checkWord(
  answer: TypedAnswer,
  word: Word,
  focus: WordsFocus,
): Outcome | null {
  const asked = [
    focus !== "meaning" && answer.reading,
    focus !== "reading" && answer.meaning,
  ];
  if (!asked.some((text) => text && text.trim())) return null;
  const reading =
    focus === "meaning" ? null : checkAnswer(answer.reading, word.hiragana);
  const meaning =
    focus === "reading"
      ? null
      : checkMeaning(answer.meaning, word.meaning)
        ? "correct"
        : "incorrect";
  // with "both", correct only when the reading and the meaning are, "almost" when the reading is
  const verdict = meaning === "incorrect" ? meaning : (reading ?? "correct");
  return { verdict, reading, meaning };
}

/** Where the answers of a practice go. */
export interface Recorder {
  word: (word: Word, verdict: Verdict) => void;
  kana: (script: KanaScript, hiragana: string, hit: boolean) => void;
}

/** Word practice: active words, weighted by past mistakes. "almost" is a real verdict here. */
export function wordsMode(
  words: Word[],
  stats: Stats,
  focus: WordsFocus,
  recorder: Recorder,
): PracticeMode<Word> {
  return {
    pool: words.filter((w) => !w.disabled),
    keyOf: (w) => w.id,
    weightOf: (w) => drawWeight(stats.words[w.id]),
    check: (answer, w) => checkWord(answer, w, focus),
    record: recorder.word,
  };
}

/** An item of a mixed practice: a word or a kana. */
export type PracticeItem =
  { kind: "word"; word: Word } | { kind: "kana"; kana: Kana };

/** A run of the answer as written, with its furigana above it and its romaji below it. */
export interface AnswerPart extends FuriganaPart {
  romaji: string;
}

/** The right answer of an item, shown with the verdict. */
export interface RightAnswer {
  /** The word as written, or the kana symbol, with its reading above what is not hiragana */
  written: AnswerPart[];
  romaji: string;
  /** Only for words */
  meaning?: string;
}

/** The word or kana as written, with its reading: what the result shows and the voice says. */
export function pronouncedOf(item: PracticeItem): Pronounced {
  return item.kind === "word"
    ? { written: item.word.japanese, reading: item.word.hiragana }
    : { written: item.kana.symbol, reading: item.kana.hiragana };
}

export function rightAnswer(item: PracticeItem): RightAnswer {
  const { written, reading: hiragana } = pronouncedOf(item);
  const parts = furigana(written, hiragana);
  const romaji = toDisplayRomajiRuns(
    parts.map((part) => part.reading ?? part.text),
  );
  return {
    written: parts.map((part, i) => ({ ...part, romaji: romaji[i] })),
    romaji: toDisplayRomaji(hiragana),
    meaning: item.kind === "word" ? item.word.meaning : undefined,
  };
}

/** Words and kana drawn together; each item is weighted, checked and recorded by its own mode. */
export function mixedMode(
  words: Word[],
  selected: string[],
  stats: Stats,
  focus: WordsFocus,
  recorder: Recorder,
): PracticeMode<PracticeItem> {
  const wordMode = wordsMode(words, stats, focus, recorder);
  const kana = kanaMode(selected, stats, recorder);
  return {
    pool: [
      ...wordMode.pool.map((word): PracticeItem => ({ kind: "word", word })),
      ...kana.pool.map((k): PracticeItem => ({ kind: "kana", kana: k })),
    ],
    keyOf: (item) =>
      item.kind === "word"
        ? `word:${wordMode.keyOf(item.word)}`
        : `kana:${kana.keyOf(item.kana)}`,
    weightOf: (item) =>
      item.kind === "word"
        ? wordMode.weightOf(item.word)
        : kana.weightOf(item.kana),
    check: (answer, item) =>
      item.kind === "word"
        ? wordMode.check(answer, item.word)
        : kana.check(answer, item.kana),
    record: (item, verdict) =>
      item.kind === "word"
        ? wordMode.record(item.word, verdict)
        : kana.record(item.kana, verdict),
  };
}

/** Kana practice over the selected keys (see `kanaKey`). Single sounds have no vowel-length ambiguity, so anything but a match is wrong. */
export function kanaMode(
  selected: string[],
  stats: Stats,
  recorder: Recorder,
): PracticeMode<Kana> {
  return {
    pool: buildKana(selected),
    keyOf: (k) => k.symbol,
    weightOf: (k) => drawWeight(stats.kana[kanaKey(k.script, k.hiragana)]),
    check: ({ reading }, k) => {
      if (!reading.trim()) return null;
      const verdict =
        checkAnswer(reading, k.hiragana) === "correct"
          ? "correct"
          : "incorrect";
      return { verdict, reading: verdict, meaning: null };
    },
    record: (k, verdict) =>
      recorder.kana(k.script, k.hiragana, verdict === "correct"),
  };
}
