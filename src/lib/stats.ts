import { kanaKey, type KanaScript } from './kana'
import type { Stats, Tally, Verdict, Word } from './types'

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

/** Weight of an item that was never answered: above the ceiling of any answered one, so everything gets seen. */
const UNSEEN_WEIGHT = 6
const MIN_WEIGHT = 0.5
const WEIGHT_RANGE = 4.5

/** Mean number of answers per item, counting items without a tally as zero. */
export function meanAttempts(tallies: (Tally | undefined)[]): number {
  if (!tallies.length) return 0
  return tallies.reduce((sum, t) => sum + (t ? attempts(t) : 0), 0) / tallies.length
}

/**
 * How likely an item is to be drawn, relative to the others. Never-answered items come first.
 * For the rest, a smoothed miss rate (one phantom miss and one phantom hit) gives the base
 * weight, 0.5 to 5, so a single miss does not dominate and hits slowly lower it. That base is
 * then scaled by how the item's attempts compare with `mean` (see `meanAttempts`): items shown
 * more than average are damped and those shown less are lifted (about 0.65x to 1.25x), so a few
 * hard items cannot take over the session.
 */
export function drawWeight(tally: Tally | undefined, mean = 0): number {
  const n = tally ? attempts(tally) : 0
  if (!tally || n === 0) return UNSEEN_WEIGHT
  const missRate = (tally.misses + 1) / (n + 2)
  const coverage = Math.pow(Math.min(2, Math.max(0.25, (mean + 1) / (n + 1))), 0.3)
  return (MIN_WEIGHT + WEIGHT_RANGE * missRate) * coverage
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
