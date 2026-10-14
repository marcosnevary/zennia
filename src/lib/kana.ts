import { toKatakana } from 'wanakana'

export type KanaScript = 'hiragana' | 'katakana'

export interface Kana {
  /** The symbol shown in practice */
  symbol: string
  /** The same sound in hiragana: the source of truth for checking answers */
  hiragana: string
  script: KanaScript
}

export interface KanaRow {
  /** Romaji label of the row (empty for the vowels) */
  label: string
  /** Hiragana cells in column order; null leaves a gap in the grid */
  cells: (string | null)[]
}

export interface KanaSection {
  id: string
  title: string
  /** Column headers of the grid */
  columns: string[]
  rows: KanaRow[]
}

const row = (label: string, cells: string): KanaRow => ({
  label,
  cells: [...cells].map((c) => (c === '・' ? null : c)),
})

// ぢ / づ (and their combinations) are left out: they sound like じ / ず,
// so there is no single romaji to ask for.
export const KANA_SECTIONS: KanaSection[] = [
  {
    id: 'basic',
    title: 'Basic',
    columns: ['a', 'i', 'u', 'e', 'o'],
    rows: [
      row('', 'あいうえお'),
      row('k', 'かきくけこ'),
      row('s', 'さしすせそ'),
      row('t', 'たちつてと'),
      row('n', 'なにぬねの'),
      row('h', 'はひふへほ'),
      row('m', 'まみむめも'),
      row('y', 'や・ゆ・よ'),
      row('r', 'らりるれろ'),
      row('w', 'わ・・・を'),
      row('ん', 'ん・・・・'),
    ],
  },
  {
    id: 'dakuten',
    title: 'Dakuten',
    columns: ['a', 'i', 'u', 'e', 'o'],
    rows: [
      row('g', 'がぎぐげご'),
      row('z', 'ざじずぜぞ'),
      row('d', 'だ・・でど'),
      row('b', 'ばびぶべぼ'),
      row('p', 'ぱぴぷぺぽ'),
    ],
  },
  {
    id: 'combo',
    title: 'Combinations',
    columns: ['ya', 'yu', 'yo'],
    rows: [
      { label: 'ky', cells: ['きゃ', 'きゅ', 'きょ'] },
      { label: 'sh', cells: ['しゃ', 'しゅ', 'しょ'] },
      { label: 'ch', cells: ['ちゃ', 'ちゅ', 'ちょ'] },
      { label: 'ny', cells: ['にゃ', 'にゅ', 'にょ'] },
      { label: 'hy', cells: ['ひゃ', 'ひゅ', 'ひょ'] },
      { label: 'my', cells: ['みゃ', 'みゅ', 'みょ'] },
      { label: 'ry', cells: ['りゃ', 'りゅ', 'りょ'] },
      { label: 'gy', cells: ['ぎゃ', 'ぎゅ', 'ぎょ'] },
      { label: 'j', cells: ['じゃ', 'じゅ', 'じょ'] },
      { label: 'by', cells: ['びゃ', 'びゅ', 'びょ'] },
      { label: 'py', cells: ['ぴゃ', 'ぴゅ', 'ぴょ'] },
    ],
  },
]

/** Identifies one character of one script, e.g. "katakana:か". */
export function kanaKey(script: KanaScript, hiragana: string): string {
  return `${script}:${hiragana}`
}

export function symbolOf(script: KanaScript, hiragana: string): string {
  return script === 'hiragana' ? hiragana : toKatakana(hiragana)
}

/** Every hiragana in the grid, in table order. */
export const ALL_HIRAGANA: string[] = KANA_SECTIONS.flatMap((s) =>
  s.rows.flatMap((r) => r.cells.filter((c): c is string => c !== null)),
)

/** Builds the practice pool from the selected keys (see `kanaKey`). */
export function buildKana(selected: string[]): Kana[] {
  const chosen = new Set(selected)
  const out: Kana[] = []
  for (const hiragana of ALL_HIRAGANA) {
    for (const script of ['hiragana', 'katakana'] as const) {
      if (chosen.has(kanaKey(script, hiragana))) {
        out.push({ symbol: symbolOf(script, hiragana), hiragana, script })
      }
    }
  }
  return out
}
