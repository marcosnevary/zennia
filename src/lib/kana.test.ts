import { describe, expect, it } from 'vitest'
import { buildKana } from './kana'
import { checkAnswer, toDisplayRomaji } from './romaji'

describe('buildKana', () => {
  it('builds hiragana and katakana for the same sounds', () => {
    const kana = buildKana(['hiragana', 'katakana'], ['basic'])
    expect(kana.find((k) => k.symbol === 'か')?.hiragana).toBe('か')
    expect(kana.find((k) => k.symbol === 'カ')?.hiragana).toBe('か')
    expect(kana.filter((k) => k.script === 'katakana')).toHaveLength(kana.length / 2)
  })

  it('respects the selected script and groups', () => {
    const kana = buildKana(['katakana'], ['combo'])
    expect(kana.every((k) => k.script === 'katakana' && k.group === 'combo')).toBe(true)
    expect(kana.map((k) => k.symbol)).toContain('キョ')
  })

  it('accepts its own displayed romaji for every symbol', () => {
    for (const k of buildKana(['hiragana', 'katakana'], ['basic', 'dakuten', 'combo'])) {
      expect(checkAnswer(toDisplayRomaji(k.hiragana), k.hiragana), k.symbol).toBe('correct')
    }
  })

  it('accepts alternative spellings and rejects wrong answers', () => {
    expect(checkAnswer('si', 'し')).toBe('correct')
    expect(checkAnswer('n', 'ん')).toBe('correct')
    expect(checkAnswer('wo', 'を')).toBe('correct')
    expect(checkAnswer('ka', 'き')).toBe('incorrect')
  })
})
