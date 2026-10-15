import { describe, expect, it } from 'vitest'
import { mergeWords, sanitizeWords, sortWords } from './words'

describe('sanitizeWords and mergeWords', () => {
  it('accepts a list or an object with words and ignores invalid items', () => {
    const a = sanitizeWords([{ japanese: '犬', hiragana: 'いぬ', meaning: 'dog' }, { japanese: '' }, 5])
    expect(a.words).toHaveLength(1)
    expect(a.skipped).toBe(2)
    expect(a.words[0].id).toBeTruthy()
    const b = sanitizeWords({ version: 1, words: [{ id: 'x', japanese: '猫', hiragana: 'ねこ', meaning: 'cat' }] })
    expect(b.words[0].id).toBe('x')
  })
  it('rejects invalid format', () => {
    expect(() => sanitizeWords({ foo: 1 })).toThrow()
    const c = sanitizeWords([
      { japanese: '犬', hiragana: 'いぬ', disabled: true },
      { japanese: '猫', hiragana: 'ねこ', disabled: 'yes' },
    ])
    expect(c.words[0].disabled).toBe(true)
    expect(c.words[1].disabled).toBeUndefined()
  })
  it('merge appends a new meaning to an existing word', () => {
    const cur = sanitizeWords([{ id: '1', japanese: '犬', hiragana: 'いぬ', meaning: 'dog' }]).words
    const r = mergeWords(cur, sanitizeWords([{ japanese: '犬', hiragana: 'いぬ', meaning: 'hound' }]).words)
    expect(r.updated).toBe(1)
    expect(r.words).toHaveLength(1)
    expect(r.words[0].meaning).toBe('dog; hound')
    expect(cur[0].meaning).toBe('dog')
    const again = mergeWords(r.words, sanitizeWords([{ japanese: '犬', hiragana: 'いぬ', meaning: 'hound' }]).words)
    expect(again.updated).toBe(0)
    expect(again.duplicates).toBe(1)
  })
  it('merge ignores duplicates', () => {
    const cur = sanitizeWords([{ id: '1', japanese: '犬', hiragana: 'いぬ', meaning: 'dog' }]).words
    const inc = sanitizeWords([
      { id: '2', japanese: '犬', hiragana: 'いぬ', meaning: 'dog' },
      { id: '3', japanese: '猫', hiragana: 'ねこ', meaning: 'cat' },
    ]).words
    const r = mergeWords(cur, inc)
    expect(r.added).toBe(1)
    expect(r.duplicates).toBe(1)
    expect(r.words).toHaveLength(2)
  })
})

describe('sortWords', () => {
  const w = (id: string, japanese: string, hiragana: string, meaning = '', disabled?: boolean) =>
    disabled ? { id, japanese, hiragana, meaning, disabled } : { id, japanese, hiragana, meaning }
  const list = [w('1', '犬', 'いぬ', 'dog'), w('2', '猫', 'ねこ', ''), w('3', '赤', 'あか', 'red', true), w('4', '木', 'き', 'tree')]
  const ids = (xs: { id: string }[]) => xs.map((x) => x.id).join('')

  it('keeps or reverses the stored order', () => {
    expect(ids(sortWords(list, 'list', 'asc'))).toBe('1234')
    expect(ids(sortWords(list, 'list', 'desc'))).toBe('4321')
  })

  it('sorts by reading in gojūon order', () => {
    expect(ids(sortWords(list, 'reading', 'asc'))).toBe('3142')
    expect(ids(sortWords(list, 'reading', 'desc'))).toBe('2413')
  })

  it('puts words without a meaning last in both directions', () => {
    expect(ids(sortWords(list, 'meaning', 'asc'))).toBe('1342')
    expect(ids(sortWords(list, 'meaning', 'desc'))).toBe('4312')
  })

  it('sorts by status keeping ties in stored order, and does not mutate the input', () => {
    expect(ids(sortWords(list, 'status', 'asc'))).toBe('1243')
    expect(ids(sortWords(list, 'status', 'desc'))).toBe('3124')
    expect(ids(list)).toBe('1234')
  })
})
