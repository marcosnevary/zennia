import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { loadKanaSelection, loadStats, loadWords, saveKanaSelection, saveStats, saveWords } from './storage'
import { emptyStats } from './stats'
import type { Stats, Word } from '../core/types'

/** A localStorage stand-in that can be made to fail. */
function fakeStorage() {
  const data = new Map<string, string>()
  const failures = { read: false, write: false }
  const storage = {
    getItem: (key: string) => {
      if (failures.read) throw new Error('blocked')
      return data.get(key) ?? null
    },
    setItem: (key: string, value: string) => {
      if (failures.write) throw new Error('quota exceeded')
      data.set(key, value)
    },
  }
  return { storage, data, failures }
}

let store: ReturnType<typeof fakeStorage>

beforeEach(() => {
  store = fakeStorage()
  vi.stubGlobal('localStorage', store.storage)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

const word: Word = { id: 'w1', japanese: '食べる', hiragana: 'たべる', meaning: 'to eat', disabled: false, tags: [] }
const stats: Stats = { words: { w1: { hits: 2, misses: 1 } }, kana: { 'hiragana:か': { hits: 1, misses: 0 } } }

describe('words', () => {
  it('reads back what was saved', () => {
    saveWords([word])
    expect(loadWords()).toEqual([word])
  })

  it('saves under zennia:words in the versioned format', () => {
    saveWords([word])
    expect(JSON.parse(store.data.get('zennia:words')!)).toEqual({ version: 2, words: [word] })
  })

  it('is empty when nothing was saved or the saved text is not valid', () => {
    expect(loadWords()).toEqual([])
    store.data.set('zennia:words', '{not json')
    expect(loadWords()).toEqual([])
    store.data.set('zennia:words', '{"foo":1}')
    expect(loadWords()).toEqual([])
  })

  it('cleans what it reads, dropping items without a word or reading', () => {
    store.data.set('zennia:words', JSON.stringify({ version: 1, words: [word, { japanese: '', hiragana: '' }] }))
    expect(loadWords()).toEqual([word])
  })

  it('still reads a version 1 file saved before tags existed, with no tags', () => {
    store.data.set('zennia:words', JSON.stringify({ version: 1, words: [{ id: 'w1', japanese: '食べる', hiragana: 'たべる', meaning: 'to eat' }] }))
    expect(loadWords()).toEqual([word])
  })

  it('survives a blocked or full storage', () => {
    store.failures.read = true
    expect(loadWords()).toEqual([])
    store.failures.write = true
    expect(() => saveWords([word])).not.toThrow()
  })
})

describe('stats', () => {
  it('reads back what was saved, under zennia:stats', () => {
    saveStats(stats)
    expect(JSON.parse(store.data.get('zennia:stats')!)).toEqual({ version: 1, stats })
    expect(loadStats()).toEqual(stats)
  })

  it('is empty when nothing was saved or the saved text is not valid', () => {
    expect(loadStats()).toEqual(emptyStats())
    store.data.set('zennia:stats', 'garbage')
    expect(loadStats()).toEqual(emptyStats())
  })

  it('survives a blocked or full storage', () => {
    store.failures.read = true
    expect(loadStats()).toEqual(emptyStats())
    store.failures.write = true
    expect(() => saveStats(stats)).not.toThrow()
  })
})

describe('kana selection', () => {
  it('reads back what was saved, under zennia:kana-selection', () => {
    saveKanaSelection(['hiragana:か', 'katakana:か'])
    expect(JSON.parse(store.data.get('zennia:kana-selection')!)).toEqual(['hiragana:か', 'katakana:か'])
    expect(loadKanaSelection()).toEqual(['hiragana:か', 'katakana:か'])
  })

  it('is null when nothing valid was saved, so the default applies', () => {
    expect(loadKanaSelection()).toBeNull()
    store.data.set('zennia:kana-selection', 'garbage')
    expect(loadKanaSelection()).toBeNull()
    store.data.set('zennia:kana-selection', '{"a":1}')
    expect(loadKanaSelection()).toBeNull()
  })

  it('keeps only the string keys', () => {
    store.data.set('zennia:kana-selection', JSON.stringify(['hiragana:か', 5, null]))
    expect(loadKanaSelection()).toEqual(['hiragana:か'])
  })

  it('survives a blocked or full storage', () => {
    store.failures.read = true
    expect(loadKanaSelection()).toBeNull()
    store.failures.write = true
    expect(() => saveKanaSelection(['hiragana:か'])).not.toThrow()
  })
})
