import { describe, expect, it } from 'vitest'
import { accuracy, accuracyLevel, totalTally, drawWeight, emptyStats, pickWeighted, recordAnswer, recordKana, sanitizeStats, sortTallies } from './stats'
import type { Word } from '../core/types'

const word: Word = { id: 'w1', japanese: '食べる', hiragana: 'たべる', meaning: '', disabled: false, tags: [] }

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

describe('totalTally', () => {
  it('adds the words and the kana together', () => {
    const stats = emptyStats()
    recordAnswer(stats, word, 'correct')
    recordAnswer(stats, word, 'almost')
    recordKana(stats, 'hiragana', 'か', true)
    recordKana(stats, 'katakana', 'か', false)
    expect(totalTally(stats)).toEqual({ hits: 2, misses: 2 })
    expect(totalTally(emptyStats())).toEqual({ hits: 0, misses: 0 })
  })
})

describe('accuracyLevel', () => {
  it('is high from 80%, low under 60%, neutral in between', () => {
    expect(accuracyLevel({ hits: 4, misses: 1 })).toBe('high')
    expect(accuracyLevel({ hits: 3, misses: 2 })).toBe('')
    expect(accuracyLevel({ hits: 3, misses: 1 })).toBe('')
    expect(accuracyLevel({ hits: 1, misses: 1 })).toBe('low')
  })
  it('is neutral without answers', () => {
    expect(accuracyLevel({ hits: 0, misses: 0 })).toBe('')
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
  it('sorts by misses, accuracy and hits in either direction', () => {
    const entries: [string, { hits: number; misses: number }][] = [
      ['a', { hits: 9, misses: 3 }],
      ['b', { hits: 1, misses: 2 }],
      ['c', { hits: 5, misses: 0 }],
    ]
    expect(sortTallies(entries, 'misses').map(([k]) => k)).toEqual(['a', 'b', 'c'])
    expect(sortTallies(entries, 'accuracy', 'asc').map(([k]) => k)).toEqual(['b', 'a', 'c'])
    expect(sortTallies(entries, 'hits').map(([k]) => k)).toEqual(['a', 'c', 'b'])
    expect(sortTallies(entries, 'misses', 'asc').map(([k]) => k)).toEqual(['c', 'b', 'a'])
  })
})

describe('drawWeight and pickWeighted', () => {
  it('ranks low accuracy first, then few answers, then well-proven items', () => {
    const alwaysMissed = drawWeight({ hits: 0, misses: 2 })
    const mostlyMissed = drawWeight({ hits: 1, misses: 3 })
    const fewRight = drawWeight({ hits: 2, misses: 0 })
    const provenRight = drawWeight({ hits: 7, misses: 0 })
    expect(alwaysMissed).toBeGreaterThan(mostlyMissed)
    expect(mostlyMissed).toBeGreaterThan(fewRight)
    expect(fewRight).toBeGreaterThan(provenRight)
  })
  it('weighs an always-missed item about 10 times a proven one', () => {
    expect(drawWeight({ hits: 0, misses: 2 }) / drawWeight({ hits: 7, misses: 0 })).toBeGreaterThanOrEqual(9)
  })
  it('keeps every weight between 0.5 and 5, and a never-answered item at the ceiling', () => {
    expect(drawWeight(undefined)).toBe(5)
    expect(drawWeight({ hits: 0, misses: 1 })).toBeLessThanOrEqual(5)
    expect(drawWeight({ hits: 1000, misses: 0 })).toBeGreaterThanOrEqual(0.5)
    expect(drawWeight({ hits: 1000, misses: 0 })).toBeLessThan(0.7)
  })
  it('distrusts small samples: 100% accuracy needs more answers to fade', () => {
    const weights = [1, 2, 3, 5, 10, 20, 50].map((hits) => drawWeight({ hits, misses: 0 }))
    for (let i = 1; i < weights.length; i++) expect(weights[i]).toBeLessThan(weights[i - 1])
    // one correct answer still outweighs a long streak, and stays below an item that was missed
    expect(weights[0]).toBeGreaterThan(weights[5])
    expect(weights[0]).toBeLessThan(drawWeight({ hits: 0, misses: 1 }))
  })
  it('the same accuracy weighs more with fewer answers', () => {
    expect(drawWeight({ hits: 1, misses: 1 })).toBeGreaterThan(drawWeight({ hits: 10, misses: 10 }))
  })
  it('a miss raises the weight', () => {
    expect(drawWeight({ hits: 5, misses: 1 })).toBeGreaterThan(drawWeight({ hits: 6, misses: 0 }))
  })
  it('picks proportionally to the weights', () => {
    const items = ['a', 'b']
    const w = (x: string) => (x === 'a' ? 1 : 3)
    expect(pickWeighted(items, w, () => 0)).toBe('a')
    expect(pickWeighted(items, w, () => 0.24)).toBe('a')
    expect(pickWeighted(items, w, () => 0.26)).toBe('b')
    expect(pickWeighted(items, w, () => 0.999)).toBe('b')
  })
  it('returns null for an empty list', () => {
    expect(pickWeighted([], () => 1)).toBeNull()
  })
})
