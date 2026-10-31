import { describe, expect, it } from 'vitest'
import { indexDictionary, lookUp, parseRomajiList, type DictionaryRow } from './dictionary'

const rows: DictionaryRow[] = [
  ['ねこ', '猫', 'cat'],
  ['はし', '橋', 'bridge'],
  ['はし', '箸', 'chopsticks'],
  ['とうきょう', '東京', 'Tokyo'],
  ['ときょ', '都況', 'made up'],
  ['コーヒー', 'コーヒー', 'coffee'],
  ['ほん', '本', 'book'],
]
const dictionary = indexDictionary(rows)
const words = (romaji: string, hint = '') => lookUp(dictionary, { romaji, hint }).map((c) => c.japanese)

describe('parseRomajiList', () => {
  it('splits on new lines, commas and semicolons and reads hints, also with commas inside', () => {
    expect(parseRomajiList('neko, taberu\nhashi (end, tip);  koohii \n\n')).toEqual([
      { romaji: 'neko', hint: '' },
      { romaji: 'taberu', hint: '' },
      { romaji: 'hashi', hint: 'end, tip' },
      { romaji: 'koohii', hint: '' },
    ])
  })
  it('drops repeats and empty items', () => {
    expect(parseRomajiList('neko,,neko, (cat)')).toEqual([{ romaji: 'neko', hint: '' }])
  })
})

describe('lookUp', () => {
  it('finds words by sound, whatever the spelling system or script', () => {
    expect(words('neko')).toEqual(['猫'])
    expect(words('ko-hi-')).toEqual(['コーヒー'])
    expect(words('honn')).toEqual(['本'])
    expect(words('xyzzy')).toEqual([])
  })
  it('lists the same sound first and marks a vowel-length difference as almost', () => {
    expect(lookUp(dictionary, { romaji: 'tokyo', hint: '' }).map((c) => [c.japanese, c.verdict])).toEqual([
      ['都況', 'correct'],
      ['東京', 'almost'],
    ])
    expect(words('toukyou')).toEqual(['東京', '都況'])
  })
  it('keeps dictionary order, unless a hint matches a meaning', () => {
    expect(words('hashi')).toEqual(['橋', '箸'])
    expect(words('hashi', 'Chopstick')).toEqual(['箸', '橋'])
  })
})
