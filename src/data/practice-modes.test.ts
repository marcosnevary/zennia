import { describe, expect, it } from 'vitest'
import { kanaMode, wordsMode } from './practice-modes'
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
