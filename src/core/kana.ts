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
  /** Leaves extra space before this row's column (separates blocks inside one table) */
  gap?: boolean
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

export const KANA_SECTIONS: KanaSection[] = [
  {
    id: 'main',
    title: 'Basic & Dakuten',
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
      { ...row('g', 'がぎぐげご'), gap: true },
      row('z', 'ざじずぜぞ'),
      row('d', 'だぢづでど'),
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
      { label: 'dy', cells: ['ぢゃ', 'ぢゅ', 'ぢょ'] },
      { label: 'by', cells: ['びゃ', 'びゅ', 'びょ'] },
      { label: 'py', cells: ['ぴゃ', 'ぴゅ', 'ぴょ'] },
    ],
  },
]

/** Identifies one character of one script, e.g. "katakana:か". */
export function kanaKey(script: KanaScript, hiragana: string): string {
  return `${script}:${hiragana}`
}

/** Undoes `kanaKey`; null for anything that is not a key of a known script. */
export function parseKanaKey(key: string): { script: KanaScript; hiragana: string } | null {
  for (const script of ['hiragana', 'katakana'] as const) {
    if (key.startsWith(`${script}:`)) return { script, hiragana: key.slice(script.length + 1) }
  }
  return null
}

export function symbolOf(script: KanaScript, hiragana: string): string {
  return script === 'hiragana' ? hiragana : toKatakana(hiragana)
}

/** Every hiragana in the grid, in table order. */
export const ALL_HIRAGANA: string[] = KANA_SECTIONS.flatMap((s) =>
  s.rows.flatMap((r) => r.cells.filter((c): c is string => c !== null)),
)

/** ぢ / づ sound exactly like じ / ず, so either romaji is right (di / ji, du / zu). */
export function acceptedReadings(hiragana: string): string[] {
  const alias = hiragana.replace(/ぢ/g, 'じ').replace(/づ/g, 'ず')
  return alias === hiragana ? [hiragana] : [hiragana, alias]
}

const cellsOf = (cells: (string | null)[]): string[] => cells.filter((c): c is string => c !== null)

/** Keys of every kana of a section, for one script. */
export function sectionKeys(script: KanaScript, section: KanaSection): string[] {
  return section.rows.flatMap((r) => cellsOf(r.cells).map((h) => kanaKey(script, h)))
}

/** Keys of the kana of one row of the grid (one consonant, drawn as a column), for one script. */
export function columnKeys(script: KanaScript, row: KanaRow): string[] {
  return cellsOf(row.cells).map((h) => kanaKey(script, h))
}

/** Keys of the kana of one vowel line of a section (one entry of `columns`), across its rows, for one script. */
export function lineKeys(script: KanaScript, section: KanaSection, index: number): string[] {
  return section.rows
    .map((r) => r.cells[index])
    .filter((h): h is string => !!h)
    .map((h) => kanaKey(script, h))
}

/** Keys of every kana of one script. */
export function scriptKeys(script: KanaScript): string[] {
  return KANA_SECTIONS.flatMap((s) => sectionKeys(script, s))
}

/** What is practiced the first time: the basic hiragana, everything before the dakuten block. */
export function defaultKanaSelection(): string[] {
  const [main] = KANA_SECTIONS
  const basic = main.rows.slice(0, main.rows.findIndex((r) => r.gap))
  return basic.flatMap((r) => columnKeys('hiragana', r))
}

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
