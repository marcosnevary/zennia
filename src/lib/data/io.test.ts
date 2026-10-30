import { describe, expect, it } from 'vitest'
import { exportFilename, exportJSON, importJSON } from './io'

describe('exportFilename', () => {
  it('names the file after the date of the export', () => {
    expect(exportFilename(new Date('2026-10-16T13:40:00Z'))).toBe('zennia-words-2026-10-16.json')
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
