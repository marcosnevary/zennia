import { describe, expect, it } from 'vitest'
import { annotate, furigana } from './furigana'

describe('furigana', () => {
  it('puts the reading above the kanji only, not the hiragana that follows', () => {
    expect(furigana('食べる', 'たべる')).toEqual([{ text: '食', reading: 'た' }, { text: 'べる' }])
  })

  it('splits the reading between kanji runs separated by hiragana', () => {
    expect(furigana('取り扱い', 'とりあつかい')).toEqual([
      { text: '取', reading: 'と' },
      { text: 'り' },
      { text: '扱', reading: 'あつか' },
      { text: 'い' },
    ])
    expect(furigana('お茶', 'おちゃ')).toEqual([{ text: 'お' }, { text: '茶', reading: 'ちゃ' }])
  })

  it('gives a run of several kanji, or katakana, the whole of its reading', () => {
    expect(furigana('日本語', 'にほんご')).toEqual([{ text: '日本語', reading: 'にほんご' }])
    expect(furigana('ア', 'あ')).toEqual([{ text: 'ア', reading: 'あ' }])
  })

  it('has no reading for a word written in hiragana', () => {
    expect(furigana('たべる', 'たべる')).toEqual([{ text: 'たべる' }])
  })

  it('gives the whole word the reading when its hiragana does not fit it', () => {
    expect(furigana('食べる', 'くう')).toEqual([{ text: '食べる', reading: 'くう' }])
  })
})

describe('annotate', () => {
  it('gives each run its own romaji', () => {
    expect(annotate('食べる', 'たべる')).toEqual([{ text: '食', reading: 'た', romaji: 'ta' }, { text: 'べる', romaji: 'beru' }])
    expect(annotate('ア', 'あ')).toEqual([{ text: 'ア', reading: 'あ', romaji: 'a' }])
  })

  it('keeps a word in hiragana as one run', () => {
    expect(annotate('たべる', 'たべる')).toEqual([{ text: 'たべる', romaji: 'taberu' }])
  })
})
