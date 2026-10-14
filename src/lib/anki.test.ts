import { describe, expect, it } from 'vitest'
import { importAnkiDeck, parseTSV } from './anki'

const card = (front: string, back: string) => `"${front.replace(/"/g, '""')}"\t"${back.replace(/"/g, '""')}"`

const watashi = card(
  `<div lang="ja">\n私\n<div style='font-size: 20px;'><b>私</b>はアンです。</div>\n</div>`,
  `<div lang="ja">\n<ruby><rb>私</rb><rt>わたし</rt></ruby>\n<!-- {{#Pitch Accent}} -->\n<div style='font-size: 25px; padding-bottom:20px'>I (polite, general)</div>\n<div style='font-size: 25px;'><b><ruby><rb>私</rb><rt>わたし</rt></ruby></b>はアンです。</div>\n</div>`,
)
const anata = card(
  `<div lang="ja">\nあなた\n<div><b>あなた</b>は</div>\n</div>`,
  `<div lang="ja">\nあなた\n<div style='font-size: 25px; padding-bottom:20px'>you (usually when one doesn't know)</div>\n</div>`,
)
const ikiru = card(
  `<div lang="ja">\n生きる\n<div>x</div>\n</div>`,
  `<div lang="ja">\n<ruby><rb>生</rb><rt>い</rt></ruby>きる\n<div style='font-size: 25px'>to&nbsp;live, to&nbsp;exist</div>\n</div>`,
)

describe('parseTSV', () => {
  it('skips # headers and handles quoted multi-line fields', () => {
    expect(parseTSV('#separator:tab\n"a\nb ""q"""\tc\nd\te\n')).toEqual([
      ['a\nb "q"', 'c'],
      ['d', 'e'],
    ])
  })
})

describe('importAnkiDeck', () => {
  const text = `#separator:tab\n#html:true\n${[watashi, anata, ikiru].join('\n')}\n`

  it('maps word, reading (from furigana) and meaning', () => {
    const { words, skipped } = importAnkiDeck(text)
    expect(skipped).toBe(0)
    expect(words.map(({ japanese, hiragana, meaning }) => ({ japanese, hiragana, meaning }))).toEqual([
      { japanese: '私', hiragana: 'わたし', meaning: 'I (polite, general)' },
      { japanese: 'あなた', hiragana: 'あなた', meaning: "you (usually when one doesn't know)" },
      { japanese: '生きる', hiragana: 'いきる', meaning: 'to live, to exist' },
    ])
  })
  it('skips cards whose reading is not kana', () => {
    const bad = card(`<div lang="ja">\n漢字\n</div>`, `<div lang="ja">\n漢字\n<div>kanji</div>\n</div>`)
    expect(importAnkiDeck(`${bad}\n${anata}`)).toMatchObject({ skipped: 1, words: [{ japanese: 'あなた' }] })
  })
  it('rejects text that is not an Anki export', () => {
    expect(() => importAnkiDeck('just one column')).toThrow()
  })
  it('reads simple decks: meaning first, reading in a hiragana block', () => {
    const simple = '#separator:tab\n#html:true\n人\t"person from\n\n<hr class=""notes-divider"">\n\n<div class=""hiragana"">\n    じん\n</div>"'
    expect(importAnkiDeck(simple)).toMatchObject({
      skipped: 0,
      words: [{ japanese: '人', hiragana: 'じん', meaning: 'person from' }],
    })
  })
  it('uses a kana-only front as its own reading when the back has no reading', () => {
    expect(importAnkiDeck('ねこ\tcat\n')).toMatchObject({ words: [{ japanese: 'ねこ', hiragana: 'ねこ', meaning: 'cat' }] })
  })
})
