import { describe, expect, it } from 'vitest'
import { ALL_HIRAGANA, KANA_SECTIONS, buildKana, kanaKey } from './kana'
import { checkAnswer, toDisplayRomaji } from './romaji'

describe('buildKana', () => {
  it('builds hiragana and katakana for the same sound', () => {
    const kana = buildKana([kanaKey('hiragana', 'か'), kanaKey('katakana', 'か')])
    expect(kana.map((k) => k.symbol)).toEqual(['か', 'カ'])
    expect(kana.every((k) => k.hiragana === 'か')).toBe(true)
  })

  it('only includes what was selected', () => {
    expect(buildKana([])).toEqual([])
    const kana = buildKana([kanaKey('katakana', 'きょ')])
    expect(kana).toEqual([{ symbol: 'キョ', hiragana: 'きょ', script: 'katakana' }])
  })

  it('has no duplicated characters in the grid', () => {
    expect(new Set(ALL_HIRAGANA).size).toBe(ALL_HIRAGANA.length)
  })

  it('keeps every row as wide as its columns', () => {
    for (const s of KANA_SECTIONS) {
      for (const r of s.rows) expect(r.cells, s.id + r.label).toHaveLength(s.columns.length)
    }
  })

  it('accepts its own displayed romaji for every symbol', () => {
    const all = ALL_HIRAGANA.flatMap((h) => [kanaKey('hiragana', h), kanaKey('katakana', h)])
    for (const k of buildKana(all)) {
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
