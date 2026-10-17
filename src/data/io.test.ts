import { describe, expect, it } from 'vitest'
import { exportFilename, exportStatsJSON, importStatsJSON, statsExportFilename } from './io'

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
