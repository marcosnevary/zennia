import { toHiragana, toRomaji } from 'wanakana'
import type { Verdict } from './types'

const VOWEL_KANA: Record<string, string> = { a: 'あ', i: 'い', u: 'う', e: 'え', o: 'お' }

/** Each macron vowel can be written in more than one way in kana. */
const MACRONS: Record<string, string[]> = {
  ā: ['aa'],
  ī: ['ii'],
  ū: ['uu'],
  ē: ['ei', 'ee'],
  ō: ['ou', 'oo'],
}

const MAX_CANDIDATES = 256

/** Expands macrons into every possible spelling (ō → ou / oo). */
function expandMacrons(text: string): string[] {
  let results = ['']
  for (const ch of text) {
    const options = MACRONS[ch] ?? [ch]
    const next: string[] = []
    for (const prefix of results) {
      for (const option of options) next.push(prefix + option)
    }
    results = next.slice(0, MAX_CANDIDATES)
  }
  return results
}

/**
 * Converts to hiragana and replaces the long vowel mark (ー) with the
 * matching vowel, so that こーひー and こおひい are the same sound.
 */
export function normalizeKana(text: string): string {
  // wanakana converts ー to う in the o row; here we always use the same vowel
  const hira = toHiragana(text.replace(/\s+/g, ''), { convertLongVowelMark: false })
  let out = ''
  for (const ch of hira) {
    if (ch === 'ー' && out) {
      const prev = [...out].at(-1)!
      const vowel = toRomaji(prev).match(/[aiueo]$/)?.[0]
      out += vowel ? VOWEL_KANA[vowel] : ch
    } else {
      out += ch
    }
  }
  return out
}

/** Romaji ignoring vowel length (used only to detect "almost"). */
function skeleton(kana: string): string {
  return toRomaji(kana)
    .replace(/aa/g, 'a')
    .replace(/ii/g, 'i')
    .replace(/uu/g, 'u')
    .replace(/ee|ei/g, 'e')
    .replace(/oo|ou/g, 'o')
}

/**
 * Compares what was typed with the saved hiragana.
 * - correct: same sound (accepts shi/si, chi/ti, tsu/tu, fu/hu, macrons, uppercase)
 * - almost: only the length of some vowel differs
 * - incorrect: any other difference
 */
export function checkAnswer(input: string, hiragana: string): Verdict {
  if (!input.trim()) return 'incorrect'

  const target = normalizeKana(hiragana)
  const typed = expandMacrons(input.trim().toLowerCase())
  // "nn" at the end of a word is a common way to type ん
  const variants = typed.flatMap((t) => (t.endsWith('nn') ? [t, t.slice(0, -1)] : [t]))
  const candidates = variants.map(normalizeKana)

  if (candidates.includes(target)) return 'correct'

  const targetSkeleton = skeleton(target)
  if (candidates.some((c) => skeleton(c) === targetSkeleton)) return 'almost'

  return 'incorrect'
}

/** Romaji shown in the answer: derived from the hiragana, never saved. */
export function toDisplayRomaji(hiragana: string): string {
  return toRomaji(normalizeKana(hiragana))
}
