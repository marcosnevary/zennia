import { kanaKey, type KanaScript } from '../core/kana'
import type { Stats, Tally, Verdict, Word } from '../core/types'

export function emptyStats(): Stats {
  return { words: {}, kana: {} }
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
  return { words: sanitizeTallies(o.words), kana: sanitizeTallies(o.kana) }
}

function bump(tallies: Record<string, Tally>, key: string, hit: boolean): void {
  const tally = tallies[key] ?? { hits: 0, misses: 0 }
  if (hit) tally.hits++
  else tally.misses++
  tallies[key] = tally
}

/** Records one checked answer of the word practice. "almost" counts as a miss, like in the session score. */
export function recordAnswer(stats: Stats, word: Word, verdict: Verdict): void {
  bump(stats.words, word.id, verdict === 'correct')
}

/** Records one answer of the hiragana/katakana practice. */
export function recordKana(stats: Stats, script: KanaScript, hiragana: string, hit: boolean): void {
  bump(stats.kana, kanaKey(script, hiragana), hit)
}

/** Sum of every tally in a record. */
export function sumTallies(tallies: Record<string, Tally>): Tally {
  return Object.values(tallies).reduce(
    (sum, t) => ({ hits: sum.hits + t.hits, misses: sum.misses + t.misses }),
    { hits: 0, misses: 0 },
  )
}

/** Words and kana together. */
export function totalTally(stats: Stats): Tally {
  const words = sumTallies(stats.words)
  const kana = sumTallies(stats.kana)
  return { hits: words.hits + kana.hits, misses: words.misses + kana.misses }
}

export function attempts(tally: Tally): number {
  return tally.hits + tally.misses
}

/** Accuracy from 0 to 1, or null when there are no attempts. */
export function accuracy(tally: Tally): number | null {
  const total = attempts(tally)
  return total ? tally.hits / total : null
}

/** How the list highlights a tally: high from 80%, low under 60%, neutral in between or without answers. */
export function accuracyLevel(tally: Tally): 'high' | 'low' | '' {
  const a = accuracy(tally)
  return a === null ? '' : a >= 0.8 ? 'high' : a < 0.6 ? 'low' : ''
}

export function percent(value: number | null): string {
  return value === null ? '–' : `${Math.round(value * 100)}%`
}

export type StatsSort = 'misses' | 'accuracy' | 'hits'
export type StatsSortDirection = 'asc' | 'desc'

export const STATS_SORT_OPTIONS: { key: StatsSort; label: string }[] = [
  { key: 'misses', label: 'Misses' },
  { key: 'accuracy', label: 'Accuracy' },
  { key: 'hits', label: 'Correct' },
]

/**
 * Sorts [key, tally] entries by the chosen value (`desc` = highest first). Ties fall back to more
 * attempts, then key order, whatever the direction.
 */
export function sortTallies(
  entries: [string, Tally][],
  sort: StatsSort,
  direction: StatsSortDirection = 'desc',
): [string, Tally][] {
  const score = ([, t]: [string, Tally]) =>
    sort === 'misses' ? t.misses : sort === 'hits' ? t.hits : (accuracy(t) ?? 1)
  const sign = direction === 'asc' ? 1 : -1
  return [...entries].sort(
    (a, b) => sign * (score(a) - score(b)) || attempts(b[1]) - attempts(a[1]) || a[0].localeCompare(b[0], 'ja'),
  )
}

const MIN_WEIGHT = 0.5
const MAX_WEIGHT = 5

/** How much a lack of answers adds to the priority: 1 answer adds half of it, 7 answers an eighth. */
const SAMPLE_SHARE = 0.3

/**
 * How likely an item is to be drawn, relative to the others. The priority (0 to 1) is the miss rate
 * plus a bonus that shrinks with the number of answers, so low accuracy comes first, then few answers.
 * A never-answered item has the top priority, tying with items that are always missed. The weight
 * grows exponentially from 0.5 to 5 (10 times between the extremes) and no item ever drops to zero.
 */
export function drawWeight(tally: Tally | undefined): number {
  const n = tally ? attempts(tally) : 0
  const priority = tally && n > 0 ? Math.min(1, tally.misses / n + SAMPLE_SHARE / (1 + n)) : 1
  return MIN_WEIGHT * (MAX_WEIGHT / MIN_WEIGHT) ** priority
}

/** Weighted random choice; `random` returns a number in [0, 1) and can be replaced in tests. */
export function pickWeighted<T>(items: T[], weightOf: (item: T) => number, random: () => number = Math.random): T | null {
  if (!items.length) return null
  const weights = items.map((item) => Math.max(0, weightOf(item)))
  let remaining = random() * weights.reduce((a, b) => a + b, 0)
  for (let i = 0; i < items.length; i++) {
    remaining -= weights[i]
    if (remaining < 0) return items[i]
  }
  return items[items.length - 1]
}
