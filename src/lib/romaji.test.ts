import { describe, expect, it } from 'vitest'
import { checkAnswer, toDisplayRomaji } from './romaji'
import { mergeWords, sanitizeWords } from './words'

describe('checkAnswer: accepts spelling-system variations', () => {
  it('exact romaji', () => {
    expect(checkAnswer('taberu', 'たべる')).toBe('correct')
  })
  it('uppercase and extra spaces', () => {
    expect(checkAnswer('  Taberu ', 'たべる')).toBe('correct')
  })
  it('shi/si, chi/ti, tsu/tu, fu/hu, ji/zi', () => {
    expect(checkAnswer('sushi', 'すし')).toBe('correct')
    expect(checkAnswer('susi', 'すし')).toBe('correct')
    expect(checkAnswer('chikatetsu', 'ちかてつ')).toBe('correct')
    expect(checkAnswer('tikatetu', 'ちかてつ')).toBe('correct')
    expect(checkAnswer('huro', 'ふろ')).toBe('correct')
    expect(checkAnswer('zikan', 'じかん')).toBe('correct')
  })
  it('macron accepts any expansion', () => {
    expect(checkAnswer('tōkyō', 'とうきょう')).toBe('correct')
    expect(checkAnswer('ōkii', 'おおきい')).toBe('correct')
    expect(checkAnswer('ōsaka', 'おおさか')).toBe('correct')
  })
  it('katakana saved as hiragana or with ー', () => {
    expect(checkAnswer('koohii', 'コーヒー')).toBe('correct')
    expect(checkAnswer('ko-hi-', 'こーひー')).toBe('correct')
    expect(checkAnswer('koohii', 'こおひい')).toBe('correct')
  })
  it('ん before a vowel and gemination', () => {
    expect(checkAnswer("kin'en", 'きんえん')).toBe('correct')
    expect(checkAnswer('kinen', 'きねん')).toBe('correct')
    expect(checkAnswer('nn', 'ん')).toBe('correct')
    expect(checkAnswer('kann', 'かん')).toBe('correct')
    expect(checkAnswer('konnnichiha', 'こんにちは')).toBe('incorrect')
    expect(checkAnswer('gakkou', 'がっこう')).toBe('correct')
  })
})

describe('checkAnswer: long vowel and errors', () => {
  it('only the vowel length differs → almost', () => {
    expect(checkAnswer('tokyo', 'とうきょう')).toBe('almost')
    expect(checkAnswer('obasan', 'おばあさん')).toBe('almost')
    expect(checkAnswer('yuki', 'ゆうき')).toBe('almost')
    expect(checkAnswer('biru', 'ビール')).toBe('almost')
  })
  it('different words → incorrect', () => {
    expect(checkAnswer('nomu', 'たべる')).toBe('incorrect')
    expect(checkAnswer('', 'たべる')).toBe('incorrect')
    expect(checkAnswer('食べる', 'たべる')).toBe('incorrect')
  })
})

describe('toDisplayRomaji', () => {
  it('generates romaji from hiragana', () => {
    expect(toDisplayRomaji('たべる')).toBe('taberu')
    expect(toDisplayRomaji('がっこう')).toBe('gakkou')
    expect(toDisplayRomaji('コーヒー')).toBe('koohii')
  })
})

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
  it('merge ignores duplicates', () => {
    const cur = sanitizeWords([{ id: '1', japanese: '犬', hiragana: 'いぬ', meaning: 'dog' }]).words
    const inc = sanitizeWords([
      { id: '2', japanese: '犬', hiragana: 'いぬ', meaning: 'hound' },
      { id: '3', japanese: '猫', hiragana: 'ねこ', meaning: 'cat' },
    ]).words
    const r = mergeWords(cur, inc)
    expect(r.added).toBe(1)
    expect(r.duplicates).toBe(1)
    expect(r.words).toHaveLength(2)
  })
})
