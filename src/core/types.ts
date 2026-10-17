export interface Word {
  id: string
  /** Japanese word (kanji/kana), as shown in practice */
  japanese: string
  /** Reading in hiragana: the source of truth for checking answers */
  hiragana: string
  /** Meaning(s), free text */
  meaning: string
  /** When true the word is excluded from practice. Always stored, `false` for an enabled word. */
  disabled: boolean
  /** Free-text labels to organize the word list. Always stored, empty when the word has none. */
  tags: string[]
}

export type Verdict = 'correct' | 'almost' | 'incorrect'

/** Format of the export file and of localStorage */
export interface WordsFile {
  /** 2 added `tags` to each word; version 1 files are still read, their words get no tags. */
  version: 2
  exportedAt?: string
  words: Word[]
}

export interface Tally {
  hits: number
  misses: number
}

/** Lifetime results: per word (by id) and per kana of the hiragana/katakana practice (see `kanaKey`) */
export interface Stats {
  words: Record<string, Tally>
  kana: Record<string, Tally>
}

export interface StatsFile {
  version: 1
  exportedAt?: string
  stats: Stats
}
