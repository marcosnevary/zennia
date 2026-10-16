import { describe, expect, it } from 'vitest'
import { makeWord, mergeWords, sanitizeWords, searchWords, sortWords, updateWord, validateWord } from './words'

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
    expect(c.words[1].disabled).toBe(false)
  })
  it('always stores disabled as a boolean, false when it was missing', () => {
    const { words } = sanitizeWords([
      { japanese: '犬', hiragana: 'いぬ' },
      { japanese: '猫', hiragana: 'ねこ', disabled: false },
    ])
    expect(words.map((w) => w.disabled)).toEqual([false, false])
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
  const w = (id: string, japanese: string, hiragana: string, meaning = '', disabled = false) => ({
    id,
    japanese,
    hiragana,
    meaning,
    disabled,
  })
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

describe('validateWord', () => {
  const fields = { japanese: '食べる', hiragana: 'たべる', meaning: '' }

  it('accepts a word with a kana reading, with or without a meaning', () => {
    expect(validateWord(fields)).toBe('')
    expect(validateWord({ ...fields, meaning: 'to eat' })).toBe('')
  })

  it('asks for both the word and the reading, ignoring surrounding spaces', () => {
    const message = 'Fill in the Japanese word and the hiragana.'
    expect(validateWord({ ...fields, japanese: '' })).toBe(message)
    expect(validateWord({ ...fields, hiragana: '' })).toBe(message)
    expect(validateWord({ ...fields, japanese: '   ' })).toBe(message)
  })

  it('only takes kana as the reading: hiragana, katakana and the long vowel mark', () => {
    const message = 'The hiragana field must contain only kana (hiragana, katakana or ー).'
    expect(validateWord({ ...fields, hiragana: 'taberu' })).toBe(message)
    expect(validateWord({ ...fields, hiragana: '食べる' })).toBe(message)
    expect(validateWord({ ...fields, hiragana: ' コーヒー ' })).toBe('')
  })
})

describe('makeWord and updateWord', () => {
  const typed = { japanese: ' 食べる ', hiragana: ' たべる ', meaning: ' to eat ' }

  it('makeWord trims the fields and starts the word enabled with a fresh id', () => {
    const a = makeWord(typed)
    expect(a).toMatchObject({ japanese: '食べる', hiragana: 'たべる', meaning: 'to eat', disabled: false })
    expect(a.id).toBeTruthy()
    expect(makeWord(typed).id).not.toBe(a.id)
  })

  it('updateWord replaces the texts but keeps the id and whether the word is disabled', () => {
    const word = { ...makeWord({ japanese: '犬', hiragana: 'いぬ', meaning: 'dog' }), disabled: true }
    expect(updateWord(word, typed)).toEqual({
      id: word.id,
      japanese: '食べる',
      hiragana: 'たべる',
      meaning: 'to eat',
      disabled: true,
    })
    expect(word.japanese).toBe('犬')
  })
})

describe('searchWords', () => {
  const word = (id: string, japanese: string, hiragana: string, meaning: string) =>
    ({ id, japanese, hiragana, meaning, disabled: false })
  const list = [word('1', '犬', 'いぬ', 'Dog'), word('2', '猫', 'ねこ', 'cat'), word('3', '食べる', 'たべる', 'to eat')]
  const ids = (query: string) => searchWords(list, query).map((w) => w.id)

  it('returns everything for an empty or blank search', () => {
    expect(ids('')).toEqual(['1', '2', '3'])
    expect(ids('   ')).toEqual(['1', '2', '3'])
  })

  it('matches the word, the reading, the romaji and the meaning', () => {
    expect(ids('猫')).toEqual(['2'])
    expect(ids('たべ')).toEqual(['3'])
    expect(ids('inu')).toEqual(['1'])
    expect(ids('eat')).toEqual(['3'])
  })

  it('ignores case and surrounding spaces, and keeps the list order', () => {
    expect(ids('  DOG ')).toEqual(['1'])
    expect(ids('a')).toEqual(['2', '3'])
    expect(ids('nothing like this')).toEqual([])
  })
})
