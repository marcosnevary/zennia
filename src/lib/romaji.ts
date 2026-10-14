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

/** Every hiragana reading the typed text can stand for (macron expansions, final "nn"). */
function answerCandidates(input: string): string[] {
  const typed = expandMacrons(input.trim().toLowerCase())
  // "nn" at the end of a word is a common way to type ん
  const variants = typed.flatMap((t) => (t.endsWith('nn') ? [t, t.slice(0, -1)] : [t]))
  return variants.map(normalizeKana)
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
  const candidates = answerCandidates(input)

  if (candidates.includes(target)) return 'correct'

  const targetSkeleton = skeleton(target)
  if (candidates.some((c) => skeleton(c) === targetSkeleton)) return 'almost'

  return 'incorrect'
}

/** Romaji shown in the answer: derived from the hiragana, never saved. */
export function toDisplayRomaji(hiragana: string): string {
  return toRomaji(normalizeKana(hiragana))
}

export interface KanaOutcome {
  /** The kana as saved in the reading (hiragana or katakana) */
  kana: string
  /** True when this kana was typed correctly */
  hit: boolean
}

/** Marks which target positions an optimal (edit distance) alignment matches. */
function alignedHits(target: string[], typed: string[]): { hits: boolean[]; distance: number } {
  const n = target.length
  const m = typed.length
  const d = Array.from({ length: n + 1 }, (_, i) =>
    Array.from({ length: m + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)),
  )
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      d[i][j] = Math.min(
        d[i - 1][j] + 1,
        d[i][j - 1] + 1,
        d[i - 1][j - 1] + (target[i - 1] === typed[j - 1] ? 0 : 1),
      )
    }
  }
  const hits = new Array<boolean>(n).fill(false)
  let i = n
  let j = m
  while (i > 0 && j > 0) {
    if (target[i - 1] === typed[j - 1] && d[i][j] === d[i - 1][j - 1]) {
      hits[i - 1] = true
      i--
      j--
    } else if (d[i][j] === d[i - 1][j - 1] + 1) {
      i--
      j--
    } else if (d[i][j] === d[i - 1][j] + 1) {
      i--
    } else {
      j--
    }
  }
  return { hits, distance: d[n][m] }
}

/**
 * Per-kana result of an answer: aligns the typed sound with the saved reading
 * and marks each kana of the reading as hit or missed, using the typed spelling
 * closest to the reading. The long vowel mark (ー) is not a kana of its own and is skipped.
 */
export function kanaBreakdown(input: string, hiragana: string): KanaOutcome[] {
  const original = [...hiragana.replace(/\s+/g, '')]
  const target = [...normalizeKana(hiragana)]
  // normalizing is one-to-one for kana; fall back to the hiragana form otherwise
  const labels = original.length === target.length ? original : target

  let best = { hits: new Array<boolean>(target.length).fill(false), distance: Infinity }
  for (const candidate of answerCandidates(input)) {
    const aligned = alignedHits(target, [...candidate])
    if (aligned.distance < best.distance) best = aligned
  }

  const outcomes: KanaOutcome[] = []
  target.forEach((_, i) => {
    if (labels[i] !== 'ー') outcomes.push({ kana: labels[i], hit: best.hits[i] })
  })
  return outcomes
}
