import { acceptedReadings, buildKana, kanaKey, type Kana } from '../core/kana'
import { checkAnswer } from '../core/romaji'
import type { Stats, Word } from '../core/types'
import type { PracticeMode } from './practice-session'
import { drawWeight, recordAnswer, recordKana } from './stats'

/** Word practice: enabled words, weighted by past mistakes. "almost" is a real verdict here. */
export function wordsMode(words: Word[], stats: Stats): PracticeMode<Word> {
  return {
    pool: words.filter((w) => !w.disabled),
    keyOf: (w) => w.id,
    weightOf: (w) => drawWeight(stats.words[w.id]),
    check: (answer, w) => checkAnswer(answer, w.hiragana),
    record: (w, verdict) => recordAnswer(stats, w, verdict),
  }
}

/** Kana practice over the selected keys (see `kanaKey`). Single sounds have no vowel-length ambiguity, so anything but a match is wrong. */
export function kanaMode(selected: string[], stats: Stats): PracticeMode<Kana> {
  return {
    pool: buildKana(selected),
    keyOf: (k) => k.symbol,
    weightOf: (k) => drawWeight(stats.kana[kanaKey(k.script, k.hiragana)]),
    check: (answer, k) =>
      acceptedReadings(k.hiragana).some((h) => checkAnswer(answer, h) === 'correct') ? 'correct' : 'incorrect',
    record: (k, verdict) => recordKana(stats, k.script, k.hiragana, verdict === 'correct'),
  }
}
