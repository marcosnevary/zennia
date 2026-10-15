import { describe, expect, it } from 'vitest'
import { accuracy, emptyStats, recordAnswer, recordKana, sanitizeStats, sortTallies } from './stats'
import type { Word } from '../core/types'

const word: Word = { id: 'w1', japanese: '食べる', hiragana: 'たべる', meaning: '' }

describe('recordAnswer', () => {
  it('counts only the word, never the kana inside it', () => {
    const stats = emptyStats()
    recordAnswer(stats, word, 'correct')
    recordAnswer(stats, word, 'incorrect')
    recordAnswer(stats, word, 'almost')
    expect(stats.words.w1).toEqual({ hits: 1, misses: 2 })
    expect(stats.kana).toEqual({})
  })
})

describe('recordKana', () => {
  it('keeps hiragana and katakana apart', () => {
    const stats = emptyStats()
    recordKana(stats, 'katakana', 'か', false)
    recordKana(stats, 'hiragana', 'か', true)
    recordKana(stats, 'hiragana', 'か', true)
    expect(stats.kana['katakana:か']).toEqual({ hits: 0, misses: 1 })
    expect(stats.kana['hiragana:か']).toEqual({ hits: 2, misses: 0 })
    expect(stats.words).toEqual({})
  })
})

describe('sanitizeStats', () => {
  it('accepts valid data and drops malformed entries', () => {
    const stats = sanitizeStats({
      words: { a: { hits: 2, misses: 1 }, b: { hits: 'x' }, c: null },
      kana: { 'hiragana:あ': { hits: -3, misses: 4.9 } },
    })
    expect(stats.words).toEqual({ a: { hits: 2, misses: 1 } })
    expect(stats.kana).toEqual({ 'hiragana:あ': { hits: 0, misses: 4 } })
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
