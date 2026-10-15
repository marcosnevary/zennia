import { describe, expect, it } from 'vitest'
import { importAnkiDeck, parseTSV } from './anki'

describe('parseTSV', () => {
  it('skips # headers and handles quoted multi-line fields', () => {
    expect(parseTSV('#separator:tab\n"a\nb ""q"""\tc\nd\te\n')).toEqual([
      ['a\nb "q"', 'c'],
      ['d', 'e'],
    ])
  })
})

describe('importAnkiDeck', () => {
  const header = '#separator:tab\n#html:true\n#tags column:4\n'

  it('reads word, hiragana and meaning from the first three columns and ignores the rest', () => {
    const text = `${header}私\tわたし\tI (polite, general)\t私[わたし]\t[sound:x.mp3]\n生きる\tいきる\tto&nbsp;live<br>to exist\textra\n`
    const { words, skipped } = importAnkiDeck(text)
    expect(skipped).toBe(0)
    expect(words.map(({ japanese, hiragana, meaning }) => ({ japanese, hiragana, meaning }))).toEqual([
      { japanese: '私', hiragana: 'わたし', meaning: 'I (polite, general)' },
      { japanese: '生きる', hiragana: 'いきる', meaning: 'to live to exist' },
    ])
  })
  it('accepts a row without a meaning', () => {
    expect(importAnkiDeck(`${header}犬\tいぬ\n`)).toMatchObject({ words: [{ japanese: '犬', hiragana: 'いぬ', meaning: '' }] })
  })
  it('skips rows whose reading is missing or not kana, and repeated pairs', () => {
    const text = `${header}漢字\t漢字\tkanji\n犬\t\tdog\n犬\tいぬ\tdog\n犬\tいぬ\tdog again\n`
    expect(importAnkiDeck(text)).toMatchObject({ skipped: 3, words: [{ japanese: '犬' }] })
  })
  it('rejects text that is not an Anki export', () => {
    expect(() => importAnkiDeck('just one column')).toThrow()
  })
})
