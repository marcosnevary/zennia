import { toRomaji } from 'wanakana'
import { parseKanaKey, symbolOf, type KanaScript } from '../core/kana'
import type { Stats, Tally, Word } from '../core/types'
import { sortTallies, type StatsSort, type StatsSortDirection } from './stats'

/** Which practice a row comes from. */
export type StatsKind = 'words' | KanaScript

export interface StatsRow {
  key: string
  kind: StatsKind
  /** The word or kana shown big */
  symbol: string
  reading: string
  /** Lowercase text the search box matches against */
  search: string
  /** Whether `symbol` is Japanese text of a saved word (shown in the word font) */
  ja: boolean
  tally: Tally
}

/** One row per answered word or kana. Stats of deleted words stay saved but are not listed. */
export function buildRows(stats: Stats, words: Word[]): StatsRow[] {
  const byId = new Map(words.map((w) => [w.id, w]))
  const rows: StatsRow[] = []
  for (const [id, tally] of Object.entries(stats.words)) {
    const word = byId.get(id)
    if (!word) continue
    rows.push({
      key: `word:${id}`,
      kind: 'words',
      symbol: word.japanese,
      reading: word.hiragana,
      search: `${word.japanese} ${word.hiragana} ${toRomaji(word.hiragana)} ${word.meaning ?? ''}`.toLowerCase(),
      ja: true,
      tally,
    })
  }
  for (const [key, tally] of Object.entries(stats.kana)) {
    const parsed = parseKanaKey(key)
    if (!parsed) continue
    const { script, hiragana } = parsed
    const romaji = toRomaji(hiragana)
    const symbol = symbolOf(script, hiragana)
    rows.push({
      key,
      kind: script,
      symbol,
      reading: romaji,
      search: `${symbol} ${hiragana} ${romaji}`.toLowerCase(),
      ja: false,
      tally,
    })
  }
  return rows
}

export interface StatsFilter {
  query: string
  /** Kinds that stay in the list */
  kinds: Record<StatsKind, boolean>
  sort: StatsSort
  direction: StatsSortDirection
}

/** The rows to show: kinds switched on, matching the search text, in the chosen order. */
export function filterRows(rows: StatsRow[], { query, kinds, sort, direction }: StatsFilter): StatsRow[] {
  const q = query.trim().toLowerCase()
  const matches = rows.filter((r) => kinds[r.kind] && (!q || r.search.includes(q)))
  const byKey = new Map(matches.map((r) => [r.key, r]))
  return sortTallies(matches.map((r) => [r.key, r.tally]), sort, direction).map(([key]) => byKey.get(key)!)
}
