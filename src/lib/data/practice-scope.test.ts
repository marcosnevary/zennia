import { describe, expect, it } from 'vitest'
import type { Word } from '../core/types'
import { pruneScopeTags, resolveScope, scopedKanaSelection, scopedWords, scopeSummary, type PracticeScope } from './practice-scope'

const word = (id: string, extra: Partial<Word> = {}): Word => ({ id, japanese: id, hiragana: 'ひ', meaning: '', disabled: false, tags: [], ...extra })

const scope = (extra: Partial<PracticeScope> = {}): PracticeScope => ({ scripts: ['hiragana', 'katakana'], tags: [], untagged: false, ...extra })

describe('scopedWords', () => {
  const food = word('food', { tags: ['Food'] })
  const verb = word('verb', { tags: ['verbs'] })
  const both = word('both', { tags: ['food', 'verbs'] })
  const bare = word('bare')
  const words = [food, verb, both, bare]

  it('includes every word when the scope is null', () => {
    expect(scopedWords(words, null)).toEqual([food, verb, both, bare])
  })

  it('includes a word that has any of the chosen tags, ignoring case', () => {
    expect(scopedWords(words, scope({ tags: ['food'] }))).toEqual([food, both])
    expect(scopedWords(words, scope({ tags: ['food', 'verbs'] }))).toEqual([food, verb, both])
  })

  it('includes words without tags only when untagged is chosen', () => {
    expect(scopedWords(words, scope({ untagged: true }))).toEqual([bare])
    expect(scopedWords(words, scope({ tags: ['verbs'], untagged: true }))).toEqual([verb, both, bare])
  })

  it('includes no words when nothing is chosen', () => {
    expect(scopedWords(words, scope())).toEqual([])
  })
})

describe('scopedKanaSelection', () => {
  const selected = ['hiragana:あ', 'katakana:あ', 'hiragana:か']

  it('keeps the keys of the chosen scripts', () => {
    expect(scopedKanaSelection(selected, null)).toEqual(selected)
    expect(scopedKanaSelection(selected, scope({ scripts: ['katakana'] }))).toEqual(['katakana:あ'])
    expect(scopedKanaSelection(selected, scope({ scripts: [] }))).toEqual([])
  })
})

describe('scopeSummary', () => {
  const tags = ['food', 'verbs']

  it('says everything when nothing is left out', () => {
    expect(scopeSummary(null, tags)).toBe('Everything')
    expect(scopeSummary(scope({ tags, untagged: true }), tags)).toBe('Everything')
    expect(scopeSummary(null, [])).toBe('Everything')
  })

  it('lists the scripts, the number of tags and untagged', () => {
    expect(scopeSummary(scope({ scripts: ['hiragana'], tags: ['food'], untagged: true }), tags)).toBe('Hiragana · 1 tag · Untagged')
    expect(scopeSummary(scope({ tags }), tags)).toBe('Hiragana · Katakana · 2 tags')
    expect(scopeSummary(scope({ scripts: ['katakana'] }), tags)).toBe('Katakana')
  })

  it('ignores chosen tags that no word has', () => {
    expect(scopeSummary(scope({ scripts: [], tags: ['gone', 'Food'] }), tags)).toBe('1 tag')
  })

  it('says so when nothing is selected', () => {
    expect(scopeSummary(scope({ scripts: [] }), tags)).toBe('Nothing selected')
  })
})

describe('scope lists', () => {
  it('resolves null to everything', () => {
    expect(resolveScope(null, ['food'])).toEqual({ scripts: ['hiragana', 'katakana'], tags: ['food'], untagged: true })
    const chosen = scope({ tags: ['food'] })
    expect(resolveScope(chosen, ['x'])).toBe(chosen)
  })

  it('prunes the tags no word has anymore', () => {
    const chosen = scope({ tags: ['food', 'gone'] })
    expect(pruneScopeTags(chosen, ['Food'])).toEqual(scope({ tags: ['food'] }))
    expect(pruneScopeTags(chosen, ['food', 'gone'])).toBe(chosen)
    expect(pruneScopeTags(null, [])).toBeNull()
  })
})
