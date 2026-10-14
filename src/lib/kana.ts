import { toKatakana } from 'wanakana'

export type KanaScript = 'hiragana' | 'katakana'
export type KanaGroup = 'basic' | 'dakuten' | 'combo'

export interface Kana {
  /** The symbol shown in practice */
  symbol: string
  /** The same sound in hiragana: the source of truth for checking answers */
  hiragana: string
  script: KanaScript
  group: KanaGroup
}

// ぢ / づ (and their combinations) are left out: they sound like じ / ず,
// so there is no single romaji to ask for.
const HIRAGANA: Record<KanaGroup, string[]> = {
  basic: [
    ...'あいうえお',
    ...'かきくけこ',
    ...'さしすせそ',
    ...'たちつてと',
    ...'なにぬねの',
    ...'はひふへほ',
    ...'まみむめも',
    ...'やゆよ',
    ...'らりるれろ',
    ...'わをん',
  ],
  dakuten: [
    ...'がぎぐげご',
    ...'ざじずぜぞ',
    ...'だでど',
    ...'ばびぶべぼ',
    ...'ぱぴぷぺぽ',
  ],
  combo: [
    'きゃ', 'きゅ', 'きょ',
    'しゃ', 'しゅ', 'しょ',
    'ちゃ', 'ちゅ', 'ちょ',
    'にゃ', 'にゅ', 'にょ',
    'ひゃ', 'ひゅ', 'ひょ',
    'みゃ', 'みゅ', 'みょ',
    'りゃ', 'りゅ', 'りょ',
    'ぎゃ', 'ぎゅ', 'ぎょ',
    'じゃ', 'じゅ', 'じょ',
    'びゃ', 'びゅ', 'びょ',
    'ぴゃ', 'ぴゅ', 'ぴょ',
  ],
}

/** Builds the symbols to practice for the chosen scripts and groups. */
export function buildKana(scripts: KanaScript[], groups: KanaGroup[]): Kana[] {
  const out: Kana[] = []
  for (const group of groups) {
    for (const hiragana of HIRAGANA[group]) {
      for (const script of scripts) {
        const symbol = script === 'hiragana' ? hiragana : toKatakana(hiragana)
        out.push({ symbol, hiragana, script, group })
      }
    }
  }
  return out
}
