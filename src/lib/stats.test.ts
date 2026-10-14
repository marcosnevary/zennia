import { describe, expect, it } from 'vitest'
import { kanaBreakdown } from './romaji'
import { accuracy, emptyStats, recordAnswer, recordKana, sanitizeStats, sortTallies } from './stats'
import type { Word } from './types'

const word = (hiragana: string, id = 'w1'): Word => ({ id, japanese: hiragana, hiragana, meaning: '' })

describe('kanaBreakdown', () => {
  it('marks every kana as hit on a correct answer', () => {
    expect(kanaBreakdown('taberu', 'たべる').map((o) => o.hit)).toEqual([true, true, true])
  })
  it('marks only the wrong kana as missed', () => {
    const result = kanaBreakdown('tabero', 'たべる')
    expect(result).toEqual([
      { kana: 'た', hit: true },
      { kana: 'べ', hit: true },
      { kana: 'る', hit: false },
    ])
  })
  it('a missing kana counts as missed without shifting the others', () => {
    expect(kanaBreakdown('tabe', 'たべる').map((o) => o.hit)).toEqual([true, true, false])
    expect(kanaBreakdown('taeru', 'たべる').map((o) => o.hit)).toEqual([true, false, true])
  })
  it('an extra typed kana does not add outcomes', () => {
    expect(kanaBreakdown('tabberu', 'たべる')).toHaveLength(3)
  })
  it('keeps katakana as written and skips the long vowel mark', () => {
    expect(kanaBreakdown('kohi', 'コーヒー')).toEqual([
      { kana: 'コ', hit: true },
      { kana: 'ヒ', hit: true },
    ])
  })
  it('uses the closest macron spelling', () => {
    expect(kanaBreakdown('tōkyō', 'とうきょう').every((o) => o.hit)).toBe(true)
  })
})

describe('recordAnswer', () => {
  it('counts a correct answer for the word and its kana', () => {
    const stats = emptyStats()
    recordAnswer(stats, word('たべる'), 'taberu', 'correct')
    expect(stats.words.w1).toEqual({ hits: 1, misses: 0 })
    expect(stats.kana['hiragana:た']).toEqual({ hits: 1, misses: 0 })
  })
  it('counts almost as a miss for the word but only wrong kana as misses', () => {
    const stats = emptyStats()
    recordAnswer(stats, word('おばあさん'), 'obasan', 'almost')
    expect(stats.words.w1).toEqual({ hits: 0, misses: 1 })
    expect(stats.kana['hiragana:さ']).toEqual({ hits: 1, misses: 0 })
    expect(stats.kana['hiragana:あ']).toEqual({ hits: 0, misses: 1 })
  })
})

describe('recordKana and mixed scripts', () => {
  it('keeps hiragana and katakana apart, sharing keys with word answers', () => {
    const stats = emptyStats()
    recordKana(stats, 'katakana', 'か', false)
    recordKana(stats, 'hiragana', 'か', true)
    recordAnswer(stats, word('コーヒー'), 'kohi', 'correct')
    expect(stats.kana['katakana:か']).toEqual({ hits: 0, misses: 1 })
    expect(stats.kana['hiragana:か']).toEqual({ hits: 1, misses: 0 })
    expect(stats.kana['katakana:こ']).toEqual({ hits: 1, misses: 0 })
    // only the symbol-by-symbol practice feeds the drill total
    expect(stats.drill).toEqual({ hits: 1, misses: 1 })
  })
})

describe('sanitizeStats', () => {
  it('accepts valid data and drops malformed entries', () => {
    const stats = sanitizeStats({
      words: { a: { hits: 2, misses: 1 }, b: { hits: 'x' }, c: null },
      kana: { あ: { hits: -3, misses: 4.9 } },
    })
    expect(stats.words).toEqual({ a: { hits: 2, misses: 1 } })
    expect(stats.kana).toEqual({ あ: { hits: 0, misses: 4 } })
  })
  it('turns garbage into empty stats', () => {
    expect(sanitizeStats(null)).toEqual(emptyStats())
    expect(sanitizeStats('nope')).toEqual(emptyStats())
  })
})

describe('accuracy and sorting', () => {
  it('accuracy is null without attempts', () => {
    expect(accuracy({ hits: 0, misses: 0 })).toBeNull()
    expect(accuracy({ hits: 3, misses: 1 })).toBe(0.75)
  })
  it('sorts by most missed, lowest accuracy and most correct', () => {
    const entries: [string, { hits: number; misses: number }][] = [
      ['a', { hits: 9, misses: 3 }],
      ['b', { hits: 1, misses: 2 }],
      ['c', { hits: 5, misses: 0 }],
    ]
    expect(sortTallies(entries, 'misses').map(([k]) => k)).toEqual(['a', 'b', 'c'])
    expect(sortTallies(entries, 'accuracy').map(([k]) => k)).toEqual(['b', 'a', 'c'])
    expect(sortTallies(entries, 'hits').map(([k]) => k)).toEqual(['a', 'c', 'b'])
  })
})
