import { isKatakana, toHiragana } from 'wanakana'
import { kanaKey, type KanaScript } from './kana'
import { kanaBreakdown } from './romaji'
import type { Stats, Tally, Verdict, Word } from './types'

export function emptyStats(): Stats {
  return { words: {}, kana: {}, drill: { hits: 0, misses: 0 } }
}

function count(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? Math.floor(value) : 0
}

function sanitizeTallies(raw: unknown): Record<string, Tally> {
  const out: Record<string, Tally> = {}
  if (!raw || typeof raw !== 'object') return out
  for (const [key, value] of Object.entries(raw)) {
    const o = value as Record<string, unknown> | null
    const tally = { hits: count(o?.hits), misses: count(o?.misses) }
    if (tally.hits + tally.misses > 0) out[key] = tally
  }
  return out
}

/** Validates stats read from storage; anything malformed becomes empty. */
export function sanitizeStats(raw: unknown): Stats {
  const o = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {}
  const drill = (o.drill ?? {}) as Record<string, unknown>
  return {
    words: sanitizeTallies(o.words),
    kana: sanitizeTallies(o.kana),
    drill: { hits: count(drill.hits), misses: count(drill.misses) },
  }
}

function bump(tallies: Record<string, Tally>, key: string, hit: boolean): void {
  const tally = tallies[key] ?? { hits: 0, misses: 0 }
  if (hit) tally.hits++
  else tally.misses++
  tallies[key] = tally
}

/**
 * Records one checked answer. "almost" counts as a miss, like in the session score.
 * Mutates `stats` so it works directly on Svelte state.
 */
export function recordAnswer(stats: Stats, word: Word, input: string, verdict: Verdict): void {
  bump(stats.words, word.id, verdict === 'correct')
  for (const { kana, hit } of kanaBreakdown(input, word.hiragana)) {
    const script: KanaScript = isKatakana(kana) ? 'katakana' : 'hiragana'
    bump(stats.kana, kanaKey(script, toHiragana(kana)), hit)
  }
}

/** Records one answer of the hiragana/katakana practice. */
export function recordKana(stats: Stats, script: KanaScript, hiragana: string, hit: boolean): void {
  bump(stats.kana, kanaKey(script, hiragana), hit)
  if (hit) stats.drill.hits++
  else stats.drill.misses++
}

/** Sum of every tally in a record. */
export function sumTallies(tallies: Record<string, Tally>): Tally {
  return Object.values(tallies).reduce(
    (sum, t) => ({ hits: sum.hits + t.hits, misses: sum.misses + t.misses }),
    { hits: 0, misses: 0 },
  )
}

export function attempts(tally: Tally): number {
  return tally.hits + tally.misses
}

/** Accuracy from 0 to 1, or null when there are no attempts. */
export function accuracy(tally: Tally): number | null {
  const total = attempts(tally)
  return total ? tally.hits / total : null
}

export function percent(value: number | null): string {
  return value === null ? '–' : `${Math.round(value * 100)}%`
}

export type StatsSort = 'misses' | 'accuracy' | 'hits'

export const STATS_SORT_OPTIONS: { key: StatsSort; label: string }[] = [
  { key: 'misses', label: 'Most missed' },
  { key: 'accuracy', label: 'Lowest accuracy' },
  { key: 'hits', label: 'Most correct' },
]

/** Sorts [key, tally] entries; ties fall back to more attempts, then key order. */
export function sortTallies(entries: [string, Tally][], sort: StatsSort): [string, Tally][] {
  const score = ([, t]: [string, Tally]) =>
    sort === 'misses' ? -t.misses : sort === 'hits' ? -t.hits : (accuracy(t) ?? 1)
  return [...entries].sort(
    (a, b) => score(a) - score(b) || attempts(b[1]) - attempts(a[1]) || a[0].localeCompare(b[0], 'ja'),
  )
}
