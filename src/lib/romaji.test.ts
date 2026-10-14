import { describe, expect, it } from 'vitest'
import { checkAnswer, toDisplayRomaji } from './romaji'
import { mergeWords, sanitizeWords } from './words'

describe('checkAnswer: aceita variações de sistema', () => {
  it('romaji exato', () => {
    expect(checkAnswer('taberu', 'たべる')).toBe('correct')
  })
  it('maiúsculas e espaços extras', () => {
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
  it('macron aceita qualquer expansão', () => {
    expect(checkAnswer('tōkyō', 'とうきょう')).toBe('correct')
    expect(checkAnswer('ōkii', 'おおきい')).toBe('correct')
    expect(checkAnswer('ōsaka', 'おおさか')).toBe('correct')
  })
  it('katakana cadastrado em hiragana ou com ー', () => {
    expect(checkAnswer('koohii', 'コーヒー')).toBe('correct')
    expect(checkAnswer('ko-hi-', 'こーひー')).toBe('correct')
    expect(checkAnswer('koohii', 'こおひい')).toBe('correct')
  })
  it('ん antes de vogal e geminada', () => {
    expect(checkAnswer("kin'en", 'きんえん')).toBe('correct')
    expect(checkAnswer('kinen', 'きねん')).toBe('correct')
    expect(checkAnswer('nn', 'ん')).toBe('correct')
    expect(checkAnswer('kann', 'かん')).toBe('correct')
    expect(checkAnswer('konnnichiha', 'こんにちは')).toBe('incorrect')
    expect(checkAnswer('gakkou', 'がっこう')).toBe('correct')
  })
})

describe('checkAnswer: vogal longa e erros', () => {
  it('só o comprimento da vogal difere → almost', () => {
    expect(checkAnswer('tokyo', 'とうきょう')).toBe('almost')
    expect(checkAnswer('obasan', 'おばあさん')).toBe('almost')
    expect(checkAnswer('yuki', 'ゆうき')).toBe('almost')
    expect(checkAnswer('biru', 'ビール')).toBe('almost')
  })
  it('palavras diferentes → incorrect', () => {
    expect(checkAnswer('nomu', 'たべる')).toBe('incorrect')
    expect(checkAnswer('', 'たべる')).toBe('incorrect')
    expect(checkAnswer('食べる', 'たべる')).toBe('incorrect')
  })
})

describe('toDisplayRomaji', () => {
  it('gera romaji a partir do hiragana', () => {
    expect(toDisplayRomaji('たべる')).toBe('taberu')
    expect(toDisplayRomaji('がっこう')).toBe('gakkou')
    expect(toDisplayRomaji('コーヒー')).toBe('koohii')
  })
})

describe('sanitizeWords e mergeWords', () => {
  it('aceita lista ou objeto com words e ignora itens inválidos', () => {
    const a = sanitizeWords([{ japanese: '犬', hiragana: 'いぬ', meaning: 'cachorro' }, { japanese: '' }, 5])
    expect(a.words).toHaveLength(1)
    expect(a.skipped).toBe(2)
    expect(a.words[0].id).toBeTruthy()
    const b = sanitizeWords({ version: 1, words: [{ id: 'x', japanese: '猫', hiragana: 'ねこ', meaning: 'gato' }] })
    expect(b.words[0].id).toBe('x')
  })
  it('rejeita formato inválido', () => {
    expect(() => sanitizeWords({ foo: 1 })).toThrow()
  })
  it('mesclar ignora duplicados', () => {
    const cur = sanitizeWords([{ id: '1', japanese: '犬', hiragana: 'いぬ', meaning: 'cachorro' }]).words
    const inc = sanitizeWords([
      { id: '2', japanese: '犬', hiragana: 'いぬ', meaning: 'cão' },
      { id: '3', japanese: '猫', hiragana: 'ねこ', meaning: 'gato' },
    ]).words
    const r = mergeWords(cur, inc)
    expect(r.added).toBe(1)
    expect(r.duplicates).toBe(1)
    expect(r.words).toHaveLength(2)
  })
})
