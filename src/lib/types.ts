export interface Word {
  id: string
  /** Japanese word (kanji/kana), as shown in practice */
  japanese: string
  /** Reading in hiragana: the source of truth for checking answers */
  hiragana: string
  /** Meaning(s), free text */
  meaning: string
  /** When true the word is excluded from practice (absent = enabled) */
  disabled?: boolean
}

export type Verdict = 'correct' | 'almost' | 'incorrect'

/** Format of the export file and of localStorage */
export interface WordsFile {
  version: 1
  exportedAt?: string
  words: Word[]
}

export interface Tally {
  hits: number
  misses: number
}

/** Lifetime results: per word (by id) and per kana (as written in the reading) */
export interface Stats {
  words: Record<string, Tally>
  kana: Record<string, Tally>
}

export interface StatsFile {
  version: 1
  stats: Stats
}
