import { describe, expect, it } from 'vitest'
import { exportFilename, exportJSON, exportStatsJSON, importJSON, importStatsJSON, statsExportFilename } from './io'

describe('exportFilename', () => {
  it('names the file after the date of the export', () => {
    expect(exportFilename(new Date('2026-10-16T13:40:00Z'))).toBe('zennia-words-2026-10-16.json')
  })
})

describe('statsExportFilename', () => {
  it('names the file after the date of the export, apart from the words file', () => {
    expect(statsExportFilename(new Date('2026-10-16T13:40:00Z'))).toBe('zennia-stats-2026-10-16.json')
  })
})

describe('importStatsJSON', () => {
  it('reads the stats out of an exported file', () => {
    const text = JSON.stringify({
      version: 1,
      stats: { words: { a: { hits: 3, misses: 1 } }, kana: { 'hiragana:か': { hits: 2, misses: 0 } } },
    })
    expect(importStatsJSON(text)).toEqual({
      words: { a: { hits: 3, misses: 1 } },
      kana: { 'hiragana:か': { hits: 2, misses: 0 } },
    })
  })

  it('drops malformed tallies', () => {
    const text = JSON.stringify({
      version: 1,
      stats: { words: { a: { hits: -2, misses: 'x' }, b: { hits: 1, misses: 1 } }, kana: {} },
    })
    expect(importStatsJSON(text)).toEqual({ words: { b: { hits: 1, misses: 1 } }, kana: {} })
  })

  it('rejects text that is not JSON', () => {
    expect(() => importStatsJSON('nope')).toThrow('The file is not valid JSON.')
  })

  it('rejects JSON that has no stats', () => {
    expect(() => importStatsJSON('[]')).toThrow('The file has no statistics.')
    expect(() => importStatsJSON('{"version":1,"words":[]}')).toThrow('The file has no statistics.')
  })

  it('rejects a file whose tallies are all empty or malformed, so it cannot wipe the stats', () => {
    expect(() => importStatsJSON('{"version":1,"stats":{}}')).toThrow('The file has no statistics.')
    expect(() => importStatsJSON('{"version":1,"stats":{"words":{"a":{"hits":0,"misses":0}},"kana":{}}}')).toThrow(
      'The file has no statistics.',
    )
  })
})

describe('exportStatsJSON', () => {
  it('writes a versioned file that importStatsJSON reads back unchanged', () => {
    const stats = {
      words: { a: { hits: 5, misses: 2 } },
      kana: { 'katakana:カ': { hits: 1, misses: 4 } },
    }
    const text = exportStatsJSON(stats)
    expect(JSON.parse(text).version).toBe(1)
    expect(importStatsJSON(text)).toEqual(stats)
  })
})

describe('words file', () => {
  const word = { id: 'a', japanese: '犬', hiragana: 'いぬ', meaning: 'dog', disabled: false, tags: ['Pets'] }

  it('exports version 2 with the tags and imports them back', () => {
    const text = exportJSON([word])
    expect(JSON.parse(text).version).toBe(2)
    expect(importJSON(text).words).toEqual([word])
  })

  it('imports a version 1 file, whose words have no tags', () => {
    const text = JSON.stringify({ version: 1, words: [{ id: 'a', japanese: '犬', hiragana: 'いぬ', meaning: 'dog' }] })
    expect(importJSON(text).words).toEqual([{ ...word, tags: [] }])
  })

  it('skips words without a meaning', () => {
    const text = JSON.stringify([{ japanese: '犬', hiragana: 'いぬ' }, { japanese: '猫', hiragana: 'ねこ', meaning: 'cat' }])
    const r = importJSON(text)
    expect(r.words.map((w) => w.japanese)).toEqual(['猫'])
    expect(r.skipped).toBe(1)
  })
})
