import { describe, expect, it } from 'vitest'
import { buildRows, filterRows, type StatsFilter } from './stats-rows'
import { emptyStats } from './stats'
import type { Stats, Word } from '../core/types'

const word = (id: string, extra: Partial<Word> = {}): Word => ({
  id,
  japanese: '食べる',
  hiragana: 'たべる',
  meaning: 'To eat',
  disabled: false,
  ...extra,
})

describe('buildRows', () => {
  it('describes a word with its reading and a lowercase search text covering every form', () => {
    const stats: Stats = { words: { w1: { hits: 2, misses: 1 } }, kana: {} }
    const [row] = buildRows(stats, [word('w1')])
    expect(row).toMatchObject({
      key: 'word:w1',
      kind: 'words',
      symbol: '食べる',
      reading: 'たべる',
      ja: true,
      tally: { hits: 2, misses: 1 },
    })
    expect(row.search).toBe('食べる たべる taberu to eat')
  })

  it('leaves out words that were deleted, without touching their saved stats', () => {
    const stats: Stats = { words: { gone: { hits: 1, misses: 0 }, w1: { hits: 0, misses: 1 } }, kana: {} }
    expect(buildRows(stats, [word('w1')]).map((r) => r.key)).toEqual(['word:w1'])
    expect(stats.words.gone).toEqual({ hits: 1, misses: 0 })
  })

  it('lists hiragana and katakana of the same sound as separate rows', () => {
    const stats: Stats = {
      words: {},
      kana: { 'hiragana:か': { hits: 3, misses: 0 }, 'katakana:か': { hits: 0, misses: 2 } },
    }
    expect(buildRows(stats, [])).toEqual([
      { key: 'hiragana:か', kind: 'hiragana', symbol: 'か', reading: 'ka', search: 'か か ka', ja: false, tally: { hits: 3, misses: 0 } },
      { key: 'katakana:か', kind: 'katakana', symbol: 'カ', reading: 'ka', search: 'カ か ka', ja: false, tally: { hits: 0, misses: 2 } },
    ])
  })

  it('ignores kana keys it does not recognise', () => {
    const stats: Stats = { words: {}, kana: { 'kanji:火': { hits: 1, misses: 0 }, nonsense: { hits: 1, misses: 0 } } }
    expect(buildRows(stats, [])).toEqual([])
  })
})

describe('filterRows', () => {
  const stats: Stats = {
    words: { w1: { hits: 5, misses: 1 }, w2: { hits: 0, misses: 4 } },
    kana: { 'hiragana:か': { hits: 3, misses: 2 }, 'katakana:か': { hits: 1, misses: 0 } },
  }
  const rows = buildRows(stats, [word('w1'), word('w2', { japanese: '飲む', hiragana: 'のむ', meaning: 'To drink' })])
  const all: StatsFilter = {
    query: '',
    kinds: { words: true, hiragana: true, katakana: true },
    sort: 'misses',
    direction: 'desc',
  }
  const keys = (filter: Partial<StatsFilter>) => filterRows(rows, { ...all, ...filter }).map((r) => r.key)

  it('sorts by the chosen value, most misses first by default', () => {
    expect(keys({})).toEqual(['word:w2', 'hiragana:か', 'word:w1', 'katakana:か'])
    expect(keys({ sort: 'misses', direction: 'asc' })).toEqual(['katakana:か', 'word:w1', 'hiragana:か', 'word:w2'])
  })

  it('hides the kinds that are switched off', () => {
    expect(keys({ kinds: { words: false, hiragana: true, katakana: false } })).toEqual(['hiragana:か'])
  })

  it('matches the search text ignoring case and surrounding spaces', () => {
    expect(keys({ query: '  DRINK ' })).toEqual(['word:w2'])
    expect(keys({ query: 'ka' })).toEqual(['hiragana:か', 'katakana:か'])
    expect(keys({ query: 'nothing like this' })).toEqual([])
  })
})
