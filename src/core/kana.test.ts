import { describe, expect, it } from 'vitest'
import { ALL_HIRAGANA, KANA_SECTIONS, acceptedReadings, buildKana, kanaKey, parseKanaKey } from './kana'
import { checkAnswer, toDisplayRomaji } from './romaji'

describe('parseKanaKey', () => {
  it('undoes kanaKey for both scripts', () => {
    expect(parseKanaKey(kanaKey('hiragana', 'か'))).toEqual({ script: 'hiragana', hiragana: 'か' })
    expect(parseKanaKey(kanaKey('katakana', 'きょ'))).toEqual({ script: 'katakana', hiragana: 'きょ' })
  })

  it('rejects keys of an unknown script or without the separator', () => {
    expect(parseKanaKey('kanji:火')).toBeNull()
    expect(parseKanaKey('hiragana')).toBeNull()
    expect(parseKanaKey('か')).toBeNull()
  })
})

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
      const typed = toDisplayRomaji(k.hiragana)
      const ok = acceptedReadings(k.hiragana).some((h) => checkAnswer(typed, h) === 'correct')
      expect(ok, k.symbol).toBe(true)
    }
  })

  it('accepts alternative spellings and rejects wrong answers', () => {
    expect(checkAnswer('si', 'し')).toBe('correct')
    expect(checkAnswer('n', 'ん')).toBe('correct')
    expect(checkAnswer('wo', 'を')).toBe('correct')
    expect(checkAnswer('ka', 'き')).toBe('incorrect')
  })

  it('includes ぢ / づ and accepts both of their spellings', () => {
    expect(ALL_HIRAGANA).toEqual(expect.arrayContaining(['ぢ', 'づ', 'ぢゃ']))
    expect(acceptedReadings('ぢ')).toEqual(['ぢ', 'じ'])
    expect(acceptedReadings('づ')).toEqual(['づ', 'ず'])
    expect(acceptedReadings('ぢょ')).toEqual(['ぢょ', 'じょ'])
    expect(acceptedReadings('か')).toEqual(['か'])
    const ok = (answer: string, h: string) =>
      acceptedReadings(h).some((r) => checkAnswer(answer, r) === 'correct')
    expect(ok('di', 'ぢ')).toBe(true)
    expect(ok('ji', 'ぢ')).toBe(true)
    expect(ok('du', 'づ')).toBe(true)
    expect(ok('zu', 'づ')).toBe(true)
    expect(ok('ka', 'ぢ')).toBe(false)
  })
})
