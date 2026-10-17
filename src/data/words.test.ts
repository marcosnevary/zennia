import { describe, expect, it } from 'vitest'
import {
  addTag,
  allTags,
  cleanTags,
  deleteTag,
  filterByTags,
  importSummary,
  makeWord,
  mergeWords,
  removeTag,
  renameTag,
  sanitizeWords,
  searchWords,
  sortWords,
  tagHue,
  updateWord,
  validateTag,
  validateWord,
} from './words'

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
    tags: [],
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
  const fields = { japanese: '食べる', hiragana: 'たべる', meaning: '', tags: [] }

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
  const typed = { japanese: ' 食べる ', hiragana: ' たべる ', meaning: ' to eat ', tags: [] }

  it('makeWord trims the fields and starts the word enabled with a fresh id', () => {
    const a = makeWord(typed)
    expect(a).toMatchObject({ japanese: '食べる', hiragana: 'たべる', meaning: 'to eat', disabled: false })
    expect(a.id).toBeTruthy()
    expect(makeWord(typed).id).not.toBe(a.id)
  })

  it('updateWord replaces the texts but keeps the id and whether the word is disabled', () => {
    const word = { ...makeWord({ japanese: '犬', hiragana: 'いぬ', meaning: 'dog', tags: [] }), disabled: true }
    expect(updateWord(word, typed)).toEqual({
      id: word.id,
      japanese: '食べる',
      hiragana: 'たべる',
      meaning: 'to eat',
      disabled: true,
      tags: [],
    })
    expect(word.japanese).toBe('犬')
  })
})

describe('searchWords', () => {
  const word = (id: string, japanese: string, hiragana: string, meaning: string) =>
    ({ id, japanese, hiragana, meaning, disabled: false, tags: [] })
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

describe('importSummary', () => {
  it('counts what was added and what already existed', () => {
    expect(importSummary({ words: [], added: 3, updated: 0, duplicates: 1 }, 0)).toBe('3 added, 1 already existed.')
  })

  it('mentions the words that were updated', () => {
    expect(importSummary({ words: [], added: 2, updated: 1, duplicates: 0 }, 0)).toBe(
      '2 added, 1 updated, 0 already existed.',
    )
  })

  it('mentions the invalid items that were ignored', () => {
    expect(importSummary({ words: [], added: 0, updated: 0, duplicates: 2 }, 4)).toBe(
      '0 added, 2 already existed. 4 invalid item(s) ignored.',
    )
  })
})

describe('tag names', () => {
  it('cleanTags trims, drops blanks and repeats (ignoring case) and keeps the first spelling', () => {
    expect(cleanTags([' Food ', 'food', '', '  ', 'JLPT N5', 'Food'])).toEqual(['Food', 'JLPT N5'])
  })
  it('validateTag rejects blank and over-long names', () => {
    expect(validateTag('  ')).not.toBe('')
    expect(validateTag('a'.repeat(31))).not.toBe('')
    expect(validateTag('a'.repeat(30))).toBe('')
    expect(validateTag(' food ')).toBe('')
  })
})

describe('tags on words', () => {
  it('sanitizeWords stores tags as a clean list, empty when missing or malformed', () => {
    const { words } = sanitizeWords([
      { japanese: '犬', hiragana: 'いぬ', tags: [' Animals ', 'animals', 5, ''] },
      { japanese: '猫', hiragana: 'ねこ' },
      { japanese: '鳥', hiragana: 'とり', tags: 'birds' },
    ])
    expect(words.map((w) => w.tags)).toEqual([['Animals'], [], []])
  })
  it('makeWord and updateWord apply the form tags', () => {
    const word = makeWord({ japanese: '犬', hiragana: 'いぬ', meaning: '', tags: [' Pets ', 'pets'] })
    expect(word.tags).toEqual(['Pets'])
    const updated = updateWord(word, { japanese: '犬', hiragana: 'いぬ', meaning: '', tags: ['Animals'] })
    expect(updated.tags).toEqual(['Animals'])
    expect(updated.id).toBe(word.id)
  })
  it('mergeWords unites the tags of a word that already exists', () => {
    const cur = sanitizeWords([{ id: '1', japanese: '犬', hiragana: 'いぬ', meaning: 'dog', tags: ['Pets'] }]).words
    const incoming = sanitizeWords([{ japanese: '犬', hiragana: 'いぬ', meaning: 'dog', tags: ['pets', 'N5'] }]).words
    const r = mergeWords(cur, incoming)
    expect(r.words[0].tags).toEqual(['Pets', 'N5'])
    expect(r.updated).toBe(1)
    expect(r.duplicates).toBe(0)
    expect(cur[0].tags).toEqual(['Pets'])
  })
  it('mergeWords counts a word with nothing new as a duplicate', () => {
    const cur = sanitizeWords([{ id: '1', japanese: '犬', hiragana: 'いぬ', meaning: 'dog', tags: ['Pets'] }]).words
    const r = mergeWords(cur, sanitizeWords([{ japanese: '犬', hiragana: 'いぬ', meaning: 'dog', tags: ['PETS'] }]).words)
    expect(r.duplicates).toBe(1)
    expect(r.updated).toBe(0)
  })
})

describe('tag operations', () => {
  const w = (id: string, ...tags: string[]) => ({ id, japanese: id, hiragana: 'あ', meaning: '', disabled: false, tags })
  const list = [w('1', 'Food', 'N5'), w('2', 'food'), w('3'), w('4', 'Fruit', 'Food')]
  const tagsOf = (words: { tags: string[] }[]) => words.map((x) => x.tags)

  it('allTags lists each tag once, ordered ignoring case', () => {
    expect(allTags([w('1', 'b', 'A'), w('2', 'B', 'c')])).toEqual(['A', 'b', 'c'])
  })

  it('addTag gives the tag to the chosen words only, reusing the spelling already in use', () => {
    const next = addTag(list, new Set(['3', '4']), ' FOOD ')
    expect(tagsOf(next)).toEqual([['Food', 'N5'], ['food'], ['Food'], ['Fruit', 'Food']])
    expect(tagsOf(list)[2]).toEqual([])
  })

  it('removeTag takes the tag off the chosen words only, ignoring case', () => {
    expect(tagsOf(removeTag(list, new Set(['1', '2']), 'FOOD'))).toEqual([['N5'], [], [], ['Fruit', 'Food']])
  })

  it('deleteTag takes the tag off every word and keeps the words', () => {
    const next = deleteTag(list, 'food')
    expect(tagsOf(next)).toEqual([['N5'], [], [], ['Fruit']])
    expect(next).toHaveLength(4)
  })

  it('renameTag changes the tag on every word that has it', () => {
    expect(tagsOf(renameTag(list, 'food', 'Meals'))).toEqual([['Meals', 'N5'], ['Meals'], [], ['Fruit', 'Meals']])
  })

  it('renameTag to an existing tag merges the two without repeating it on a word', () => {
    const next = renameTag([w('1', 'food', 'fruit'), w('2', 'Fruit'), w('3', 'food')], 'food', 'Fruit')
    expect(tagsOf(next)).toEqual([['fruit'], ['fruit'], ['fruit']])
  })

  it('renameTag into an existing tag keeps the spelling already in use, whatever was typed', () => {
    const next = renameTag([w('1', 'Noun'), w('2', 'Verb')], 'Noun', 'verb')
    expect(tagsOf(next)).toEqual([['Verb'], ['Verb']])
  })

  it('renameTag can change only the case of a tag', () => {
    expect(tagsOf(renameTag([w('1', 'food')], 'food', 'Food'))).toEqual([['Food']])
  })

  it('filterByTags keeps the words that have every chosen tag, and everything for no tags', () => {
    const ids = (tags: string[]) => filterByTags(list, tags).map((x) => x.id)
    expect(ids([])).toEqual(['1', '2', '3', '4'])
    expect(ids(['food'])).toEqual(['1', '2', '4'])
    expect(ids(['FOOD', 'n5'])).toEqual(['1'])
    expect(ids(['food', 'fruit'])).toEqual(['4'])
  })
})

describe('tagHue', () => {
  it('gives a tag the same hue every time, ignoring case and surrounding spaces', () => {
    expect(tagHue('Food')).toBe(tagHue(' food '))
  })
  it('stays within the colour wheel and tells different tags apart', () => {
    const hues = ['food', 'verbs', 'JLPT N5', 'animals', 'travel'].map(tagHue)
    for (const h of hues) {
      expect(Number.isInteger(h)).toBe(true)
      expect(h).toBeGreaterThanOrEqual(0)
      expect(h).toBeLessThan(360)
    }
    expect(new Set(hues).size).toBeGreaterThan(3)
  })
})
