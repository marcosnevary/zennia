import { describe, expect, it } from 'vitest'
import { checkParts, joinAnswers, kanaMode, wordsMode } from './practice-modes'
import { emptyStats } from './stats'
import { kanaKey } from '../core/kana'
import type { Word } from '../core/types'

const word = (id: string, extra: Partial<Word> = {}): Word => ({ id, japanese: id, hiragana: 'おう', meaning: '', disabled: false, tags: [], ...extra })

describe('wordsMode', () => {
  it('draws only enabled words', () => {
    const mode = wordsMode([word('a'), word('b', { disabled: true })], emptyStats())
    expect(mode.pool.map((w) => w.id)).toEqual(['a'])
  })

  it('reports "almost" when only the vowel length differs', () => {
    const mode = wordsMode([word('a', { hiragana: 'おばさん' })], emptyStats())
    const [w] = mode.pool
    expect(mode.check('obaasan', w)).toBe('almost')
    expect(mode.check('obasan', w)).toBe('correct')
  })

  it('records the verdict per word id', () => {
    const stats = emptyStats()
    const mode = wordsMode([word('a')], stats)
    mode.record(mode.pool[0], 'almost')
    expect(stats.words.a).toEqual({ hits: 0, misses: 1 })
  })
})

describe('wordsMode focus', () => {
  const dog = word('dog', { hiragana: 'いぬ', meaning: 'dog; hound' })
  const stats = emptyStats()

  it('checks only the meaning when that is the focus', () => {
    const mode = wordsMode([dog], stats, 'meaning')
    expect(mode.check('Hound', dog)).toBe('correct')
    expect(mode.check('inu', dog)).toBe('incorrect')
  })

  it('needs both answers to be right with the both focus', () => {
    const mode = wordsMode([dog], stats, 'both')
    expect(mode.check(joinAnswers('inu', 'dog'), dog)).toBe('correct')
    expect(mode.check(joinAnswers('inu', 'cat'), dog)).toBe('incorrect')
    expect(mode.check(joinAnswers('neko', 'dog'), dog)).toBe('incorrect')
  })

  it('is "almost" with both only when the reading is almost and the meaning is right', () => {
    const aunt = word('aunt', { hiragana: 'おばさん', meaning: 'aunt' })
    const mode = wordsMode([aunt], stats, 'both')
    expect(mode.check(joinAnswers('obaasan', 'aunt'), aunt)).toBe('almost')
    expect(mode.check(joinAnswers('obaasan', 'uncle'), aunt)).toBe('incorrect')
  })

  it('leaves words that still need a meaning out of the pool unless only the reading is practiced', () => {
    const bare = word('bare')
    const words = [dog, bare]
    expect(wordsMode(words, stats, 'reading').pool.map((w) => w.id)).toEqual(['dog', 'bare'])
    expect(wordsMode(words, stats, 'meaning').pool.map((w) => w.id)).toEqual(['dog'])
    expect(wordsMode(words, stats, 'both').pool.map((w) => w.id)).toEqual(['dog'])
  })

  it('reports the outcome of each part for the result', () => {
    expect(checkParts(joinAnswers('inu', 'cat'), dog, 'both')).toEqual({ reading: 'correct', meaning: false })
    expect(checkParts('hound', dog, 'meaning')).toEqual({ reading: null, meaning: true })
    expect(checkParts('inu', dog, 'reading')).toEqual({ reading: 'correct', meaning: null })
  })
})

describe('kanaMode', () => {
  const selected = [kanaKey('hiragana', 'お'), kanaKey('katakana', 'お')]

  it('draws the selected symbols', () => {
    expect(kanaMode(selected, emptyStats()).pool.map((k) => k.symbol)).toEqual(['お', 'オ'])
  })

  it('counts "almost" as incorrect: a single sound has no vowel-length ambiguity', () => {
    const mode = kanaMode(selected, emptyStats())
    const [o] = mode.pool
    expect(mode.check('o', o)).toBe('correct')
    expect(mode.check('oo', o)).toBe('incorrect')
  })

  it('accepts either spelling of ぢ and づ', () => {
    const mode = kanaMode([kanaKey('hiragana', 'ぢ')], emptyStats())
    const [di] = mode.pool
    expect(mode.check('ji', di)).toBe('correct')
    expect(mode.check('di', di)).toBe('correct')
  })

  it('records per script, so hiragana and katakana stay apart', () => {
    const stats = emptyStats()
    const mode = kanaMode(selected, stats)
    mode.record(mode.pool[1], 'correct')
    expect(stats.kana['katakana:お']).toEqual({ hits: 1, misses: 0 })
    expect(stats.kana['hiragana:お']).toBeUndefined()
  })
})
