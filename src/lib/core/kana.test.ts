import { describe, expect, it } from 'vitest'
import { ALL_HIRAGANA, KANA_SECTIONS, acceptedReadings, buildKana, columnKeys, defaultKanaSelection, kanaKey, lineKeys, parseKanaKey, scriptKeys, sectionKeys, selectKeys, toggleKeys } from './kana'
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

describe('key lists', () => {
  const [main, combo] = KANA_SECTIONS

  it('sectionKeys lists every cell of a section for one script, leaving out the empty cells', () => {
    const keys = sectionKeys('hiragana', combo)
    expect(keys).toHaveLength(36)
    expect(keys.slice(0, 3)).toEqual(['hiragana:きゃ', 'hiragana:きゅ', 'hiragana:きょ'])
    expect(sectionKeys('katakana', combo)[0]).toBe('katakana:きゃ')
    // the grid has gaps (ya yu yo, wa wo, n), which are not kana
    expect(sectionKeys('hiragana', main)).toHaveLength(71)
    expect(sectionKeys('hiragana', main).every((k) => !k.endsWith(':null'))).toBe(true)
  })

  it('columnKeys lists the kana of one consonant row, without its gaps', () => {
    const y = main.rows.find((r) => r.label === 'y')!
    expect(columnKeys('hiragana', y)).toEqual(['hiragana:や', 'hiragana:ゆ', 'hiragana:よ'])
    const w = main.rows.find((r) => r.label === 'w')!
    expect(columnKeys('katakana', w)).toEqual(['katakana:わ', 'katakana:を'])
  })

  it('lineKeys lists the kana of one vowel across the consonants, skipping the gaps', () => {
    // column 1 is "i": ya yu yo and wa wo leave holes in it
    const i = lineKeys('hiragana', main, 1)
    expect(i).toHaveLength(main.rows.length - 3)
    expect(i.slice(0, 3)).toEqual(['hiragana:い', 'hiragana:き', 'hiragana:し'])
    expect(i).not.toContain('hiragana:null')
    expect(lineKeys('katakana', combo, 2)).toHaveLength(12)
  })

  it('scriptKeys joins every section of one script, without mixing in the other', () => {
    const keys = scriptKeys('katakana')
    expect(keys).toHaveLength(107)
    expect(new Set(keys).size).toBe(107)
    expect(keys.every((k) => k.startsWith('katakana:'))).toBe(true)
  })

  it('defaultKanaSelection is the basic hiragana, without dakuten, combinations or katakana', () => {
    const keys = defaultKanaSelection()
    expect(keys).toHaveLength(46)
    expect(keys).toContain('hiragana:あ')
    expect(keys).toContain('hiragana:ん')
    expect(keys).not.toContain('hiragana:が')
    expect(keys).not.toContain('hiragana:きゃ')
    expect(keys.every((k) => k.startsWith('hiragana:'))).toBe(true)
  })

  it('every key is a kana the practice can draw', () => {
    const keys = [...scriptKeys('hiragana'), ...scriptKeys('katakana')]
    expect(buildKana(keys)).toHaveLength(keys.length)
  })
})

describe('selectKeys', () => {
  it('adds the keys without repeating the ones already selected', () => {
    expect(selectKeys(['a', 'b'], ['b', 'c'], true).sort()).toEqual(['a', 'b', 'c'])
  })

  it('removes only the given keys when turned off', () => {
    expect(selectKeys(['a', 'b', 'c'], ['b', 'x'], false)).toEqual(['a', 'c'])
  })

  it('does not change the list it was given', () => {
    const selected = ['a']
    selectKeys(selected, ['b'], true)
    selectKeys(selected, ['a'], false)
    expect(selected).toEqual(['a'])
  })
})

describe('toggleKeys', () => {
  it('selects the whole group when any key was missing', () => {
    expect(toggleKeys(['a'], ['a', 'b', 'c']).sort()).toEqual(['a', 'b', 'c'])
    expect(toggleKeys([], ['a']).sort()).toEqual(['a'])
  })

  it('clears the group when every key was already selected, keeping the rest', () => {
    expect(toggleKeys(['a', 'b', 'z'], ['a', 'b'])).toEqual(['z'])
  })

  it('leaves the selection as it is for an empty group', () => {
    expect(toggleKeys(['a'], [])).toEqual(['a'])
  })
})
