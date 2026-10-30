import { acceptedReadings, buildKana, kanaKey, type Kana, type KanaScript } from '../core/kana'
import { checkMeaning } from '../core/meaning'
import { checkAnswer } from '../core/romaji'
import type { Stats, Verdict, Word } from '../core/types'
import type { PracticeMode } from './practice-session'
import { drawWeight, recordAnswer, recordKana } from './stats'
import { needsMeaning } from './words'

/** What is typed for a word: its reading, its meaning or both. */
export type WordsFocus = 'reading' | 'meaning' | 'both'

/** The two typed answers of the "both" focus as the single string a practice session takes (an input never holds a newline). */
export function joinAnswers(reading: string, meaning: string): string {
  return `${reading}\n${meaning}`
}

/** The outcome of each part of an answer; a part that is not practiced is null. */
export interface PartsResult {
  reading: Verdict | null
  meaning: boolean | null
}

/** Checks the parts of `answer` that the focus asks for (with "both", `answer` comes from `joinAnswers`). */
export function checkParts(answer: string, word: Word, focus: WordsFocus): PartsResult {
  const [reading = '', meaning = ''] = focus === 'both' ? answer.split('\n') : [answer, answer]
  return {
    reading: focus === 'meaning' ? null : checkAnswer(reading, word.hiragana),
    meaning: focus === 'reading' ? null : checkMeaning(meaning, word.meaning),
  }
}

/** The verdict of an answer: with "both", correct only when the reading and the meaning are, "almost" when the reading is. */
function checkWord(answer: string, word: Word, focus: WordsFocus): Verdict {
  const { reading, meaning } = checkParts(answer, word, focus)
  if (meaning === false) return 'incorrect'
  return reading ?? 'correct'
}

/** Where the answers of a practice go. */
export interface Recorder {
  word: (word: Word, verdict: Verdict) => void
  kana: (script: KanaScript, hiragana: string, hit: boolean) => void
}

/** A recorder that only counts the answers in `stats`, in memory. */
export function statsRecorder(stats: Stats): Recorder {
  return {
    word: (word, verdict) => recordAnswer(stats, word, verdict),
    kana: (script, hiragana, hit) => recordKana(stats, script, hiragana, hit),
  }
}

/**
 * Word practice: enabled words, weighted by past mistakes. "almost" is a real verdict here.
 * Words that still need a meaning are only drawn when the reading alone is practiced.
 */
export function wordsMode(
  words: Word[],
  stats: Stats,
  focus: WordsFocus = 'reading',
  recorder: Recorder = statsRecorder(stats),
): PracticeMode<Word> {
  return {
    pool: words.filter((w) => !w.disabled && (focus === 'reading' || !needsMeaning(w))),
    keyOf: (w) => w.id,
    weightOf: (w) => drawWeight(stats.words[w.id]),
    check: (answer, w) => checkWord(answer, w, focus),
    record: recorder.word,
  }
}

/** Kana practice over the selected keys (see `kanaKey`). Single sounds have no vowel-length ambiguity, so anything but a match is wrong. */
export function kanaMode(selected: string[], stats: Stats, recorder: Recorder = statsRecorder(stats)): PracticeMode<Kana> {
  return {
    pool: buildKana(selected),
    keyOf: (k) => k.symbol,
    weightOf: (k) => drawWeight(stats.kana[kanaKey(k.script, k.hiragana)]),
    check: (answer, k) =>
      acceptedReadings(k.hiragana).some((h) => checkAnswer(answer, h) === 'correct') ? 'correct' : 'incorrect',
    record: (k, verdict) => recorder.kana(k.script, k.hiragana, verdict === 'correct'),
  }
}
